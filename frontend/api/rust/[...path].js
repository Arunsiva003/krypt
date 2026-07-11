const { Pool } = globalThis.__KRYPT_PG_PACKAGE || require('pg');
const { Resend } = globalThis.__KRYPT_RESEND_PACKAGE || require('resend');
const crypto = require('crypto');

const KEY_NOT_STORED = '[not stored]';
const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const MAX_BODY_BYTES = Number(process.env.KRYPT_MAX_BODY_BYTES || 5 * 1024 * 1024);
const MAX_TEXT_BYTES = 200 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_NOTE_BYTES = 1024 * 1024;
const MAX_FEEDBACK_BYTES = 5000;
const MAX_ANALYTICS_METADATA_BYTES = 2000;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  analytics: { windowMs: 60 * 1000, max: 120 },
  feedback: { windowMs: 60 * 60 * 1000, max: 12 },
  write: { windowMs: 60 * 1000, max: 60 },
};
const TRANSIENT_DB_ERROR_CODES = new Set(['53300', '57P03', '08000', '08001', '08003', '08006']);
const ANALYTICS_BLOCKED_METADATA_KEY = /(cipher|content|credential|email|file|image|key|message|note|password|payload|plain|secret|text|token)/i;
const ENCRYPTION_TABLES = {
  text: {
    table: 'text_to_text',
    valueKey: 'encrypted_text',
    valueLabel: 'Encrypted text',
    maxBytes: MAX_TEXT_BYTES,
    valueColumns: ['encrypted_text', 'ciphertext', 'encrypted_data', 'text', 'content'],
  },
  image: {
    table: 'image_to_image',
    valueKey: 'encrypted_image_link',
    valueLabel: 'Encrypted image',
    maxBytes: MAX_IMAGE_BYTES,
    valueColumns: ['encrypted_image_link', 'encrypted_image', 'image_link', 'image_url', 'image', 'data_url'],
  },
  textimage: {
    table: 'text_to_image',
    valueKey: 'encrypted_image_link',
    valueLabel: 'Encoded image',
    maxBytes: MAX_IMAGE_BYTES,
    valueColumns: ['encrypted_image_link', 'encrypted_image', 'image_link', 'image_url', 'image', 'data_url'],
  },
};

let pgPool;
let sqlClient;
let schemaReady;
const rateBuckets = new Map();
const columnCache = new Map();

const databaseConnectionString = () => {
  try {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return process.env.DATABASE_URL;
  }
};

const numberFromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(data));
};

const isSecureRequest = (req) =>
  String(req.headers['x-forwarded-proto'] || '').includes('https') ||
  String(req.headers.host || '').includes('netlify.app') ||
  String(req.headers.host || '').includes('vercel.app');

const authCookie = (token, req) => [
  `krypt_session=${token}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  `Max-Age=${TOKEN_TTL_SECONDS}`,
  ...(isSecureRequest(req) ? ['Secure'] : []),
].join('; ');

const clearAuthCookie = (req) => [
  'krypt_session=',
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  'Max-Age=0',
  ...(isSecureRequest(req) ? ['Secure'] : []),
].join('; ');

const cookieValue = (req, name) => {
  const cookies = String(req.headers.cookie || '').split(';');
  const prefix = `${name}=`;
  const match = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : '';
};

const byteLength = (value) => Buffer.byteLength(String(value || ''), 'utf8');

const clientIp = (req) =>
  String(req.headers['x-nf-client-connection-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

const checkRateLimit = (req, scope) => {
  const config = RATE_LIMITS[scope];
  if (!config) return;
  const key = `${scope}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > config.max) {
    throw Object.assign(new Error('Too many requests. Please try again later.'), { status: 429 });
  }
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }

    let raw = '';
    req.on('data', (chunk) => {
      if (Buffer.byteLength(raw, 'utf8') + chunk.length > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large'), { status: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('DATABASE_URL is not configured'), { status: 500 });
  }
  if (!pgPool) {
    const ca = process.env.DATABASE_CA_CERT || process.env.PGSSLROOTCERT;
    const rejectUnauthorized = ca ? process.env.KRYPT_DB_SSL_REJECT_UNAUTHORIZED !== 'false' : process.env.KRYPT_DB_SSL_REJECT_UNAUTHORIZED === 'true';
    const ssl = process.env.KRYPT_DB_SSL === 'false'
      ? false
      : { rejectUnauthorized, ...(ca ? { ca } : {}) };
    const requestedPoolMax = numberFromEnv('KRYPT_DB_POOL_MAX', 1);
    pgPool = new Pool({
      connectionString: databaseConnectionString(),
      ssl,
      max: Math.max(1, Math.min(requestedPoolMax, 2)),
      idleTimeoutMillis: numberFromEnv('KRYPT_DB_IDLE_TIMEOUT_MS', 1000),
      connectionTimeoutMillis: numberFromEnv('KRYPT_DB_CONNECTION_TIMEOUT_MS', 5000),
      maxUses: numberFromEnv('KRYPT_DB_MAX_USES', 25),
      allowExitOnIdle: true,
    });
  }
  if (!sqlClient) {
    sqlClient = async (strings, ...values) => {
      const text = strings.reduce((query, chunk, index) => `${query}${chunk}${index < values.length ? `$${index + 1}` : ''}`, '');
      const result = await pgPool.query(text, values);
      return result.rows;
    };
  }
  return sqlClient;
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const queryRaw = async (text, values = []) => {
  getSql();
  const result = await pgPool.query(text, values);
  return result.rows;
};

const tableColumns = async (tableName, { refresh = false } = {}) => {
  if (!refresh && columnCache.has(tableName)) return columnCache.get(tableName);
  const rows = await queryRaw(
    `
      SELECT column_name, data_type, is_nullable, column_default, identity_generation, is_generated
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
  columnCache.set(tableName, rows);
  return rows;
};

const columnSet = (columns) => new Set(columns.map((column) => column.column_name));

const firstExistingColumn = (columns, candidates) => {
  const names = columnSet(columns);
  return candidates.find((candidate) => names.has(candidate)) || null;
};

const legacyFallbackValue = (column, value, user) => {
  const name = column.column_name.toLowerCase();
  if (name === 'user_id') return user.id;
  if (name === 'username') return user.username;
  if (name.includes('key')) return KEY_NOT_STORED;
  if (name.includes('image') || name.includes('text') || name.includes('cipher') || name.includes('data')) return value;
  if (column.data_type.includes('int') || column.data_type === 'numeric') return 0;
  if (column.data_type === 'boolean') return false;
  if (column.data_type.includes('timestamp') || column.data_type === 'date') return new Date();
  return '';
};

const normalizeLegacyTable = async (tableName, valueColumns = []) => {
  const columns = await tableColumns(tableName, { refresh: true });
  const names = columnSet(columns);

  if (!names.has('key_used')) {
    await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN key_used TEXT DEFAULT ${quoteLiteral(KEY_NOT_STORED)}`);
  } else {
    await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN key_used SET DEFAULT ${quoteLiteral(KEY_NOT_STORED)}`);
    await queryRaw(`UPDATE ${quoteIdentifier(tableName)} SET key_used = $1 WHERE key_used IS NULL`, [KEY_NOT_STORED]);
  }

  if (!names.has('created_at')) {
    await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  } else {
    await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN created_at SET DEFAULT NOW()`);
    await queryRaw(`UPDATE ${quoteIdentifier(tableName)} SET created_at = NOW() WHERE created_at IS NULL`);
  }

  for (const valueColumn of valueColumns) {
    if (!names.has(valueColumn)) {
      await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(valueColumn)} TEXT`);
    }
  }

  const refreshedColumns = await tableColumns(tableName, { refresh: true });
  for (const column of refreshedColumns) {
    const generated = column.identity_generation || column.is_generated === 'ALWAYS';
    const standardColumns = new Set(['id', 'user_id', 'username', 'key_used', 'created_at', ...valueColumns]);
    if (
      !standardColumns.has(column.column_name) &&
      column.is_nullable === 'NO' &&
      !column.column_default &&
      !generated
    ) {
      await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(column.column_name)} DROP NOT NULL`);
    }
  }

  columnCache.delete(tableName);
};

const relaxLegacyRequiredColumns = async (tableName, standardColumns) => {
  const columns = await tableColumns(tableName, { refresh: true });
  if (columns.some((column) => column.column_name === 'created_at')) {
    await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN created_at SET DEFAULT NOW()`);
    await queryRaw(`UPDATE ${quoteIdentifier(tableName)} SET created_at = NOW() WHERE created_at IS NULL`);
  }
  for (const column of columns) {
    const generated = column.identity_generation || column.is_generated === 'ALWAYS';
    if (
      !standardColumns.includes(column.column_name) &&
      column.is_nullable === 'NO' &&
      !column.column_default &&
      !generated
    ) {
      await queryRaw(`ALTER TABLE ${quoteIdentifier(tableName)} ALTER COLUMN ${quoteIdentifier(column.column_name)} DROP NOT NULL`);
    }
  }
  columnCache.delete(tableName);
};

const hardenFeedbackTable = async () => {
  await queryRaw('ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS name TEXT');
  await queryRaw('ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS email TEXT');
  await queryRaw("ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'suggestion'");
  await queryRaw('ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS related_tool TEXT');
  await queryRaw('ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS message TEXT');
  await queryRaw('ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await queryRaw("ALTER TABLE feedback_submissions ALTER COLUMN type SET DEFAULT 'suggestion'");
  await queryRaw('ALTER TABLE feedback_submissions ALTER COLUMN created_at SET DEFAULT NOW()');
  await queryRaw("UPDATE feedback_submissions SET type = 'suggestion' WHERE type IS NULL");
  await queryRaw('UPDATE feedback_submissions SET created_at = NOW() WHERE created_at IS NULL');
  columnCache.delete('feedback_submissions');
};

const hardenAnalyticsTable = async () => {
  let columns = await tableColumns('analytics_events', { refresh: true });
  const hasMetadata = columns.some((column) => column.column_name === 'metadata');
  await queryRaw('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await queryRaw("ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_name TEXT NOT NULL DEFAULT 'event'");
  await queryRaw("ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_group TEXT NOT NULL DEFAULT 'app'");
  await queryRaw('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS path TEXT');
  await queryRaw('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS tool TEXT');
  if (!hasMetadata) {
    await queryRaw("ALTER TABLE analytics_events ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb");
  }
  await queryRaw('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  columns = await tableColumns('analytics_events', { refresh: true });
  const metadataColumn = columns.find((column) => column.column_name === 'metadata');
  const metadataIsJson = metadataColumn?.data_type === 'jsonb' || metadataColumn?.data_type === 'json';
  await queryRaw("ALTER TABLE analytics_events ALTER COLUMN event_name SET DEFAULT 'event'");
  await queryRaw("ALTER TABLE analytics_events ALTER COLUMN event_group SET DEFAULT 'app'");
  if (metadataColumn) {
    await queryRaw(
      metadataIsJson
        ? "ALTER TABLE analytics_events ALTER COLUMN metadata SET DEFAULT '{}'::jsonb"
        : "ALTER TABLE analytics_events ALTER COLUMN metadata SET DEFAULT '{}'",
    );
  }
  await queryRaw('ALTER TABLE analytics_events ALTER COLUMN created_at SET DEFAULT NOW()');
  await queryRaw("UPDATE analytics_events SET event_name = 'event' WHERE event_name IS NULL");
  await queryRaw("UPDATE analytics_events SET event_group = 'app' WHERE event_group IS NULL");
  if (metadataColumn) {
    await queryRaw(
      metadataIsJson
        ? "UPDATE analytics_events SET metadata = '{}'::jsonb WHERE metadata IS NULL"
        : "UPDATE analytics_events SET metadata = '{}' WHERE metadata IS NULL",
    );
  }
  await queryRaw('UPDATE analytics_events SET created_at = NOW() WHERE created_at IS NULL');
  columnCache.delete('analytics_events');
};

const backfillEncryptionValueColumn = async (config) => {
  const columns = await tableColumns(config.table, { refresh: true });
  const names = columnSet(columns);
  if (!names.has(config.valueKey)) return;
  for (const candidate of config.valueColumns) {
    if (candidate !== config.valueKey && names.has(candidate)) {
      await queryRaw(
        `
          UPDATE ${quoteIdentifier(config.table)}
          SET ${quoteIdentifier(config.valueKey)} = ${quoteIdentifier(candidate)}
          WHERE ${quoteIdentifier(config.valueKey)} IS NULL AND ${quoteIdentifier(candidate)} IS NOT NULL
        `,
      );
    }
  }
  columnCache.delete(config.table);
};

const ensureSchema = async () => {
  if (schemaReady) return schemaReady;
  const sql = getSql();
  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT,
        auth_provider TEXT NOT NULL DEFAULT 'password',
        google_sub TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password'
        ) THEN
          ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        END IF;
      END $$;
    `;
    await sql`CREATE INDEX IF NOT EXISTS users_email_lookup_idx ON users (LOWER(email))`;
    await sql`CREATE INDEX IF NOT EXISTS users_username_lookup_idx ON users (LOWER(username))`;
    await sql`CREATE INDEX IF NOT EXISTS users_google_sub_lookup_idx ON users (google_sub) WHERE google_sub IS NOT NULL`;
    await sql`
      CREATE TABLE IF NOT EXISTS text_to_text (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        encrypted_text TEXT NOT NULL,
        key_used TEXT NOT NULL DEFAULT '[not stored]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE text_to_text ADD COLUMN IF NOT EXISTS key_used TEXT NOT NULL DEFAULT '[not stored]'`;
    await sql`ALTER TABLE text_to_text ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`
      CREATE TABLE IF NOT EXISTS image_to_image (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        encrypted_image_link TEXT NOT NULL,
        key_used TEXT NOT NULL DEFAULT '[not stored]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE image_to_image ADD COLUMN IF NOT EXISTS key_used TEXT NOT NULL DEFAULT '[not stored]'`;
    await sql`ALTER TABLE image_to_image ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`
      CREATE TABLE IF NOT EXISTS text_to_image (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        encrypted_image_link TEXT NOT NULL,
        key_used TEXT NOT NULL DEFAULT '[not stored]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE text_to_image ADD COLUMN IF NOT EXISTS key_used TEXT NOT NULL DEFAULT '[not stored]'`;
    await sql`ALTER TABLE text_to_image ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`
      CREATE TABLE IF NOT EXISTS secure_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        kdf TEXT NOT NULL,
        iterations INTEGER NOT NULL,
        salt TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS feedback_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        type TEXT NOT NULL DEFAULT 'suggestion',
        related_tool TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_name TEXT NOT NULL,
        event_group TEXT NOT NULL DEFAULT 'app',
        path TEXT,
        tool TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await hardenFeedbackTable();
    await hardenAnalyticsTable();
    await sql`CREATE INDEX IF NOT EXISTS text_to_text_user_id_idx ON text_to_text (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS image_to_image_user_id_idx ON image_to_image (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS text_to_image_user_id_idx ON text_to_image (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS secure_notes_user_id_idx ON secure_notes (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS feedback_submissions_created_at_idx ON feedback_submissions (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (event_name)`;
    await normalizeLegacyTable('text_to_text', ['encrypted_text']);
    await normalizeLegacyTable('image_to_image', ['encrypted_image_link']);
    await normalizeLegacyTable('text_to_image', ['encrypted_image_link']);
    await Promise.all(Object.values(ENCRYPTION_TABLES).map(backfillEncryptionValueColumn));
    await relaxLegacyRequiredColumns('feedback_submissions', ['id', 'name', 'email', 'type', 'related_tool', 'message', 'created_at']);
    await relaxLegacyRequiredColumns('analytics_events', ['id', 'user_id', 'event_name', 'event_group', 'path', 'tool', 'metadata', 'created_at']);
  })().catch((error) => {
    schemaReady = undefined;
    columnCache.clear();
    throw error;
  });
  return schemaReady;
};

const requiresAuthTokenBeforeSchema = (req, path) => {
  if (path === '/users/me' || path === '/encryptions/counts' || path === '/analytics/summary') return true;
  if (path === '/feedback' && req.method === 'GET') return true;
  if (/^\/users\/\d+$/.test(path)) return true;
  if (/^\/(text|image|textimage)(?:\/\d+)?$/.test(path)) return true;
  if (/^\/notes(?:\/\d+)?$/.test(path)) return true;
  return false;
};

const requireText = (value, label, maxBytes = MAX_TEXT_BYTES) => {
  const text = String(value || '').trim();
  if (!text) throw Object.assign(new Error(`${label} is required`), { status: 400 });
  if (byteLength(text) > maxBytes) throw Object.assign(new Error(`${label} is too large`), { status: 413 });
  return text;
};

const optionalText = (value, maxBytes) => {
  const text = String(value || '').trim();
  if (byteLength(text) > maxBytes) throw Object.assign(new Error('Field is too large'), { status: 413 });
  return text;
};

const requireEmail = (value) => {
  const email = requireText(value, 'Email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('A valid email is required'), { status: 400 });
  }
  return email;
};

const validatePassword = (password) => {
  const text = requireText(password, 'Password', 1024);
  if (text.length < 12) {
    throw Object.assign(new Error('Password must be at least 12 characters'), { status: 400 });
  }
  return text;
};

const publicUser = (user) => ({
  id: user.id,
  firstname: user.firstname,
  lastname: user.lastname,
  username: user.username,
  email: user.email,
  is_owner: ownerEmails().includes(String(user.email || '').toLowerCase()),
});

const base64Url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('JWT_SECRET is not configured'), { status: 500 });
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    username: user.username,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    iss: 'krypt',
    aud: 'krypt-web',
  }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('JWT_SECRET is not configured'), { status: 500 });
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) throw Object.assign(new Error('Authentication required'), { status: 401 });
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  const valid =
    Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) throw Object.assign(new Error('Authentication required'), { status: 401 });
  let parsedHeader;
  let claims;
  try {
    parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  if (!claims.sub || claims.iss !== 'krypt' || claims.aud !== 'krypt-web' || Number(claims.exp) <= Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  return claims;
};

const requestToken = (req) => {
  const authorization = req.headers.authorization || '';
  return cookieValue(req, 'krypt_session') || authorization.replace(/^Bearer\s+/i, '');
};

const requireRequestToken = (req) => {
  const token = requestToken(req);
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return token;
};

const authenticate = async (req) => {
  const claims = verifyToken(requireRequestToken(req));
  const rows = await getSql()`SELECT id, firstname, lastname, username, email FROM users WHERE id = ${Number(claims.sub)} LIMIT 1`;
  if (!rows[0]) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return rows[0];
};

const optionalAuthenticate = async (req) => {
  const token = requestToken(req);
  if (!token) return null;
  try {
    return await authenticate(req);
  } catch (error) {
    if (error.status && error.status < 500) return null;
    throw error;
  }
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS).toString('base64url');
  return `scrypt:${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash?.startsWith('scrypt:')) return false;
  const [, salt, stored] = storedHash.split(':');
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS);
  const storedBuffer = Buffer.from(stored, 'base64url');
  return storedBuffer.length === hash.length && crypto.timingSafeEqual(hash, storedBuffer);
};

const uniqueGoogleUsername = async (email) => {
  const sql = getSql();
  const base = email.split('@')[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'google';
  let candidate = base;
  let suffix = 1;
  while (true) {
    const rows = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${candidate}) LIMIT 1`;
    if (!rows[0]) return candidate;
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
};

const verifyGoogleCredential = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error('GOOGLE_CLIENT_ID is not configured'), { status: 500 });

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw Object.assign(new Error('Google credential could not be validated'), { status: 401 });
  const profile = await response.json();
  const validIssuer = GOOGLE_ISSUERS.has(profile.iss);
  const validExpiry = Number(profile.exp) > Math.floor(Date.now() / 1000);
  if (profile.aud !== clientId || profile.email_verified !== 'true' || !profile.sub || !profile.email || !validIssuer || !validExpiry) {
    throw Object.assign(new Error('Google credential could not be validated'), { status: 401 });
  }
  return profile;
};

const ownerEmails = () =>
  String(process.env.KRYPT_OWNER_EMAILS || process.env.KRYPT_OWNER_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const requireOwner = (user) => {
  const owners = ownerEmails();
  if (!owners.length || !owners.includes(user.email.toLowerCase())) {
    throw Object.assign(new Error('Owner access required'), { status: 403 });
  }
};

const analyticsLabel = (value, fallback = 'event', maxLength = 80) => {
  const text = String(value || '').trim().slice(0, maxLength);
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9_.:-]/g, '_');
};

const analyticsPath = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = text.startsWith('/') ? text : `/${text}`;
  return normalized.slice(0, 160);
};

const sanitizeAnalyticsMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const clean = {};
  Object.entries(metadata).slice(0, 20).forEach(([key, value]) => {
    const safeKey = String(key || '').trim().replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 50);
    if (!safeKey || ANALYTICS_BLOCKED_METADATA_KEY.test(safeKey)) return;
    if (typeof value === 'boolean') {
      clean[safeKey] = value;
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      clean[safeKey] = value;
      return;
    }
    if (typeof value === 'string') {
      const safeValue = value.trim().slice(0, 120);
      if (safeValue) clean[safeKey] = safeValue;
    }
  });
  return byteLength(JSON.stringify(clean)) > MAX_ANALYTICS_METADATA_BYTES ? {} : clean;
};

const recordAnalyticsEvent = async ({
  userId = null,
  eventName,
  eventGroup = 'app',
  path = null,
  tool = null,
  metadata = {},
}) => {
  try {
    const columns = await tableColumns('analytics_events');
    const metadataColumn = columns.find((column) => column.column_name === 'metadata');
    const metadataIsJson = metadataColumn?.data_type === 'jsonb' || metadataColumn?.data_type === 'json';
    await queryRaw(
      `
      INSERT INTO analytics_events (user_id, event_name, event_group, path, tool, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6${metadataIsJson ? '::jsonb' : ''}, $7)
      `,
      [
        userId ? Number(userId) : null,
        analyticsLabel(eventName),
        analyticsLabel(eventGroup, 'app', 40),
        analyticsPath(path),
        tool ? analyticsLabel(tool, 'tool', 80) : null,
        JSON.stringify(sanitizeAnalyticsMetadata(metadata)),
        new Date(),
      ],
    );
  } catch (error) {
    console.error('Analytics event failed', {
      code: error.code || error.name || 'unknown_error',
      event: String(eventName || 'unknown').slice(0, 80),
    });
  }
};

const countFrom = (rows) => Number(rows?.[0]?.count || 0);

const encryptionConfig = (bucket) => {
  const config = ENCRYPTION_TABLES[bucket];
  if (!config) throw Object.assign(new Error('Unknown encryption type'), { status: 404 });
  return config;
};

const normalizeEncryptionRow = (row, config, valueColumn) => ({
  id: row.id,
  user_id: row.user_id,
  username: row.username,
  [config.valueKey]: row[config.valueKey] || row[valueColumn] || '',
  key_used: row.key_used || KEY_NOT_STORED,
});

const listEncryption = async (bucket, user) => {
  const config = encryptionConfig(bucket);
  const columns = await tableColumns(config.table);
  const valueColumn = firstExistingColumn(columns, config.valueColumns) || config.valueKey;
  const rows = await queryRaw(
    `
      SELECT
        id,
        user_id,
        username,
        ${quoteIdentifier(valueColumn)} AS ${quoteIdentifier(config.valueKey)},
        COALESCE(key_used, $1) AS key_used
      FROM ${quoteIdentifier(config.table)}
      WHERE user_id = $2
      ORDER BY id DESC
    `,
    [KEY_NOT_STORED, user.id],
  );
  return rows.map((row) => normalizeEncryptionRow(row, config, config.valueKey));
};

const saveEncryption = async (bucket, user, body) => {
  const config = encryptionConfig(bucket);
  const value = requireText(body[config.valueKey], config.valueLabel, config.maxBytes);
  const columns = await tableColumns(config.table);
  const names = columnSet(columns);
  const valueColumn = firstExistingColumn(columns, config.valueColumns) || config.valueKey;
  const insertValues = {
    user_id: user.id,
    username: user.username,
    key_used: KEY_NOT_STORED,
    created_at: new Date(),
    [valueColumn]: value,
    [config.valueKey]: value,
  };

  for (const column of columns) {
    if (
      column.is_nullable === 'NO' &&
      !column.column_default &&
      !column.identity_generation &&
      column.is_generated !== 'ALWAYS' &&
      insertValues[column.column_name] === undefined
    ) {
      insertValues[column.column_name] = legacyFallbackValue(column, value, user);
    }
  }

  const insertColumns = Object.keys(insertValues).filter((column) => names.has(column) && column !== 'id');
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const values = insertColumns.map((column) => insertValues[column]);
  const rows = await queryRaw(
    `
      INSERT INTO ${quoteIdentifier(config.table)} (${insertColumns.map(quoteIdentifier).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `,
    values,
  );
  return normalizeEncryptionRow(rows[0], config, valueColumn);
};

const deleteEncryption = async (bucket, user, id) => {
  const config = encryptionConfig(bucket);
  return queryRaw(
    `DELETE FROM ${quoteIdentifier(config.table)} WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, user.id],
  );
};

const sendFeedbackEmail = async (record) => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_NOTIFY_EMAIL || process.env.KRYPT_OWNER_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL || 'Krypt <onboarding@resend.dev>';
  if (!apiKey || !to) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: `New Krypt suggestion${record.related_tool ? `: ${record.related_tool}` : ''}`,
    text: [
      `Message: ${record.message}`,
      `Name: ${record.name || '-'}`,
      `Email: ${record.email || '-'}`,
      `Type: ${record.type}`,
      `Related tool: ${record.related_tool || '-'}`,
      `Submitted: ${record.created_at}`,
    ].join('\n'),
  });
};

const handleAnalytics = async (req, path, body) => {
  if (!path.startsWith('/analytics')) return null;
  const sql = getSql();

  if (req.method === 'POST' && path === '/analytics/events') {
    checkRateLimit(req, 'analytics');
    const user = await optionalAuthenticate(req);
    await recordAnalyticsEvent({
      userId: user?.id,
      eventName: body.event_name,
      eventGroup: body.event_group || 'app',
      path: body.path,
      tool: body.tool,
      metadata: body.metadata,
    });
    return { status: 'recorded' };
  }

  if (req.method === 'GET' && path === '/analytics/summary') {
    const user = await authenticate(req);
    requireOwner(user);

    const [
      users,
      totalEvents,
      eventsToday,
      eventsLast7Days,
      feedback,
      savedText,
      savedImages,
      savedTextImages,
      notes,
      activeToday,
      activeLast7Days,
      loginsToday,
      loginsLast7Days,
      loginsAll,
      signupsToday,
      signupsLast7Days,
      signupsAll,
      eventBreakdown,
      toolBreakdown,
      deviceBreakdown,
      dailyEvents,
      recentEvents,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::INT AS count FROM users`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE created_at >= CURRENT_DATE`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::INT AS count FROM feedback_submissions`,
      sql`SELECT COUNT(*)::INT AS count FROM text_to_text`,
      sql`SELECT COUNT(*)::INT AS count FROM image_to_image`,
      sql`SELECT COUNT(*)::INT AS count FROM text_to_image`,
      sql`SELECT COUNT(*)::INT AS count FROM secure_notes`,
      sql`SELECT COUNT(DISTINCT user_id)::INT AS count FROM analytics_events WHERE user_id IS NOT NULL AND created_at >= CURRENT_DATE`,
      sql`SELECT COUNT(DISTINCT user_id)::INT AS count FROM analytics_events WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('login', 'google_login') AND created_at >= CURRENT_DATE`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('login', 'google_login') AND created_at >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('login', 'google_login')`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('signup', 'google_signup') AND created_at >= CURRENT_DATE`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('signup', 'google_signup') AND created_at >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::INT AS count FROM analytics_events WHERE event_name IN ('signup', 'google_signup')`,
      sql`
        SELECT event_name, COUNT(*)::INT AS count
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY event_name
        ORDER BY count DESC, event_name ASC
        LIMIT 12
      `,
      sql`
        SELECT tool, COUNT(*)::INT AS count
        FROM analytics_events
        WHERE tool IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY tool
        ORDER BY count DESC, tool ASC
        LIMIT 12
      `,
      sql`
        SELECT COALESCE(metadata->>'device_type', 'unknown') AS device_type, COUNT(*)::INT AS count
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY device_type
        ORDER BY count DESC, device_type ASC
      `,
      sql`
        SELECT
          TO_CHAR(days.day, 'YYYY-MM-DD') AS day,
          COALESCE(rollup.events, 0)::INT AS events,
          COALESCE(rollup.users, 0)::INT AS users
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS days(day)
        LEFT JOIN (
          SELECT
            DATE_TRUNC('day', created_at)::DATE AS event_day,
            COUNT(*)::INT AS events,
            COUNT(DISTINCT user_id)::INT AS users
          FROM analytics_events
          WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY event_day
        ) rollup ON rollup.event_day = days.day
        ORDER BY days.day ASC
      `,
      sql`
        SELECT
          ae.id,
          ae.event_name,
          ae.event_group,
          ae.path,
          ae.tool,
          ae.metadata,
          ae.created_at,
          u.username,
          u.email
        FROM analytics_events ae
        LEFT JOIN users u ON u.id = ae.user_id
        ORDER BY ae.created_at DESC
        LIMIT 40
      `,
    ]);

    return {
      generated_at: new Date().toISOString(),
      totals: {
        users: countFrom(users),
        events: countFrom(totalEvents),
        eventsToday: countFrom(eventsToday),
        eventsLast7Days: countFrom(eventsLast7Days),
        feedback: countFrom(feedback),
        savedText: countFrom(savedText),
        savedImages: countFrom(savedImages),
        savedTextImages: countFrom(savedTextImages),
        notes: countFrom(notes),
      },
      activeUsers: {
        today: countFrom(activeToday),
        last7Days: countFrom(activeLast7Days),
      },
      logins: {
        today: countFrom(loginsToday),
        last7Days: countFrom(loginsLast7Days),
        all: countFrom(loginsAll),
      },
      signups: {
        today: countFrom(signupsToday),
        last7Days: countFrom(signupsLast7Days),
        all: countFrom(signupsAll),
      },
      eventBreakdown,
      toolBreakdown,
      deviceBreakdown,
      dailyEvents,
      recentEvents,
    };
  }

  return null;
};

const handleUsers = async (req, path, body) => {
  const sql = getSql();

  if (req.method === 'POST' && path === '/users') {
    checkRateLimit(req, 'auth');
    const firstname = requireText(body.firstname, 'First name', 80);
    const lastname = requireText(body.lastname, 'Last name', 80);
    const username = requireText(body.username, 'Username', 40);
    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) {
      throw Object.assign(new Error('Username can use only letters, numbers, underscore, and hyphen'), { status: 400 });
    }
    const email = requireEmail(body.email);
    const password = validatePassword(body.password);
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) OR LOWER(username) = LOWER(${username}) LIMIT 1
    `;
    if (existing[0]) throw Object.assign(new Error('Email or username already exists'), { status: 409 });
    const rows = await sql`
      INSERT INTO users (firstname, lastname, username, email, password_hash, auth_provider)
      VALUES (${firstname}, ${lastname}, ${username}, ${email}, ${hashPassword(password)}, 'password')
      RETURNING id, firstname, lastname, username, email
    `;
    await recordAnalyticsEvent({
      userId: rows[0].id,
      eventName: 'signup',
      eventGroup: 'auth',
      metadata: { method: 'password' },
    });
    const token = signToken(rows[0]);
    return { user: publicUser(rows[0]), token };
  }

  if (req.method === 'POST' && path === '/users/login') {
    checkRateLimit(req, 'auth');
    const email = requireEmail(body.email);
    const password = requireText(body.password, 'Password');
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw Object.assign(new Error('Authentication required'), { status: 401 });
    }
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: 'login',
      eventGroup: 'auth',
      metadata: { method: 'password' },
    });
    const token = signToken(user);
    return { user: publicUser(user), token };
  }

  if (req.method === 'POST' && path === '/users/google') {
    checkRateLimit(req, 'auth');
    const profile = await verifyGoogleCredential(requireText(body.credential, 'Google credential', 8192));
    const existing = await sql`
      SELECT * FROM users WHERE google_sub = ${profile.sub} OR LOWER(email) = LOWER(${profile.email}) LIMIT 1
    `;
    let user = existing[0];
    let createdGoogleUser = false;
    if (user) {
      const rows = await sql`
        UPDATE users
        SET google_sub = ${profile.sub}, auth_provider = CASE WHEN auth_provider = 'password' THEN auth_provider ELSE 'google' END
        WHERE id = ${user.id}
        RETURNING id, firstname, lastname, username, email
      `;
      user = rows[0];
    } else {
      const username = await uniqueGoogleUsername(profile.email);
      const rows = await sql`
        INSERT INTO users (firstname, lastname, username, email, password_hash, auth_provider, google_sub)
        VALUES (${profile.given_name || profile.name || 'Google'}, ${profile.family_name || 'User'}, ${username}, ${profile.email.toLowerCase()}, NULL, 'google', ${profile.sub})
        RETURNING id, firstname, lastname, username, email
      `;
      user = rows[0];
      createdGoogleUser = true;
    }
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: createdGoogleUser ? 'google_signup' : 'google_login',
      eventGroup: 'auth',
      metadata: { method: 'google' },
    });
    const token = signToken(user);
    return { user: publicUser(user), token };
  }

  if (req.method === 'GET' && path === '/users/me') {
    return publicUser(await authenticate(req));
  }

  if (req.method === 'POST' && path === '/users/logout') {
    const user = await optionalAuthenticate(req);
    await recordAnalyticsEvent({
      userId: user?.id,
      eventName: 'logout',
      eventGroup: 'auth',
    });
    return { status: 'signed_out' };
  }

  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    const user = await authenticate(req);
    if (user.id !== Number(userMatch[1])) throw Object.assign(new Error('You do not have access to this resource'), { status: 403 });
    if (req.method === 'GET') return publicUser(user);
    if (req.method === 'PUT') {
      checkRateLimit(req, 'write');
      const firstname = body.firstname === undefined ? user.firstname : requireText(body.firstname, 'First name', 80);
      const lastname = body.lastname === undefined ? user.lastname : requireText(body.lastname, 'Last name', 80);
      if (body.password?.trim()) validatePassword(body.password);
      const passwordHash = body.password?.trim() ? hashPassword(body.password) : null;
      const rows = passwordHash
        ? await sql`UPDATE users SET firstname = ${firstname}, lastname = ${lastname}, password_hash = ${passwordHash} WHERE id = ${user.id} RETURNING id, firstname, lastname, username, email`
        : await sql`UPDATE users SET firstname = ${firstname}, lastname = ${lastname} WHERE id = ${user.id} RETURNING id, firstname, lastname, username, email`;
      await recordAnalyticsEvent({
        userId: user.id,
        eventName: 'profile_update',
        eventGroup: 'auth',
        metadata: { password_changed: Boolean(passwordHash) },
      });
      return publicUser(rows[0]);
    }
  }

  return null;
};

const handleGoogleUser = async (req, path, body) => {
  if (!(req.method === 'POST' && path === '/users/google')) return null;
  checkRateLimit(req, 'auth');
  const profile = await verifyGoogleCredential(requireText(body.credential, 'Google credential', 8192));
  await ensureSchema();
  const sql = getSql();
  const existing = await sql`
    SELECT * FROM users WHERE google_sub = ${profile.sub} OR LOWER(email) = LOWER(${profile.email}) LIMIT 1
  `;
  let user = existing[0];
  let createdGoogleUser = false;
  if (user) {
    const rows = await sql`
      UPDATE users
      SET google_sub = ${profile.sub}, auth_provider = CASE WHEN auth_provider = 'password' THEN auth_provider ELSE 'google' END
      WHERE id = ${user.id}
      RETURNING id, firstname, lastname, username, email
    `;
    user = rows[0];
  } else {
    const username = await uniqueGoogleUsername(profile.email);
    const rows = await sql`
      INSERT INTO users (firstname, lastname, username, email, password_hash, auth_provider, google_sub)
      VALUES (${profile.given_name || profile.name || 'Google'}, ${profile.family_name || 'User'}, ${username}, ${profile.email.toLowerCase()}, NULL, 'google', ${profile.sub})
      RETURNING id, firstname, lastname, username, email
    `;
    user = rows[0];
    createdGoogleUser = true;
  }
  await recordAnalyticsEvent({
    userId: user.id,
    eventName: createdGoogleUser ? 'google_signup' : 'google_login',
    eventGroup: 'auth',
    metadata: { method: 'google' },
  });
  const token = signToken(user);
  return { user: publicUser(user), token };
};

const handleEncryptions = async (req, path, body) => {
  if (req.method === 'GET' && path === '/encryptions/counts') {
    const user = await authenticate(req);
    const [textRows, imageRows, textImageRows] = await Promise.all(
      ['text', 'image', 'textimage'].map((bucket) => {
        const config = encryptionConfig(bucket);
        return queryRaw(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(config.table)} WHERE user_id = $1`, [user.id]);
      }),
    );
    return { text: countFrom(textRows), image: countFrom(imageRows), textimage: countFrom(textImageRows) };
  }

  const collection = path.match(/^\/(text|image|textimage)(?:\/(\d+))?$/);
  if (!collection) return null;
  const user = await authenticate(req);
  const [, bucket, rawId] = collection;
  if (req.method === 'GET' && !rawId) return listEncryption(bucket, user);
  if (req.method === 'POST' && !rawId) {
    checkRateLimit(req, 'write');
    const saved = await saveEncryption(bucket, user, body);
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: `save_${bucket}`,
      eventGroup: 'storage',
      tool: bucket,
    });
    return saved;
  }
  if (req.method === 'DELETE' && rawId) {
    const rows = await deleteEncryption(bucket, user, Number(rawId));
    if (!rows[0]) throw Object.assign(new Error('Record not found'), { status: 404 });
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: `delete_${bucket}`,
      eventGroup: 'storage',
      tool: bucket,
    });
    return { status: 'deleted', type: bucket, id: Number(rawId) };
  }
  return null;
};

const handleNotes = async (req, path, body) => {
  if (!path.startsWith('/notes')) return null;
  const sql = getSql();
  const user = await authenticate(req);

  if (req.method === 'GET' && path === '/notes') {
    return sql`
      SELECT id, user_id, title, ciphertext, algorithm, kdf, iterations, salt, iv
      FROM secure_notes
      WHERE user_id = ${user.id}
      ORDER BY id DESC
    `;
  }

  if (req.method === 'POST' && path === '/notes') {
    checkRateLimit(req, 'write');
    const rows = await sql`
      INSERT INTO secure_notes (user_id, title, ciphertext, algorithm, kdf, iterations, salt, iv)
      VALUES (${user.id}, ${requireText(body.title, 'Title', 120)}, ${requireText(body.ciphertext, 'Ciphertext', MAX_NOTE_BYTES)}, ${optionalText(body.algorithm || 'AES-GCM', 40)}, ${optionalText(body.kdf || 'PBKDF2', 60)}, ${Number(body.iterations) || 0}, ${optionalText(body.salt, 256)}, ${optionalText(body.iv, 256)})
      RETURNING id, user_id, title, ciphertext, algorithm, kdf, iterations, salt, iv
    `;
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: 'note_save',
      eventGroup: 'storage',
      tool: 'secure-notes',
      metadata: { algorithm: body.algorithm || 'AES-GCM', kdf: body.kdf || 'PBKDF2' },
    });
    return rows[0];
  }

  const idMatch = path.match(/^\/notes\/(\d+)$/);
  if (idMatch && req.method === 'DELETE') {
    const rows = await sql`DELETE FROM secure_notes WHERE id = ${Number(idMatch[1])} AND user_id = ${user.id} RETURNING id`;
    if (!rows[0]) throw Object.assign(new Error('Note not found'), { status: 404 });
    await recordAnalyticsEvent({
      userId: user.id,
      eventName: 'note_delete',
      eventGroup: 'storage',
      tool: 'secure-notes',
    });
    return { status: 'deleted', type: 'note', id: Number(idMatch[1]) };
  }

  return null;
};

const handleFeedback = async (req, path, body) => {
  if (path !== '/feedback') return null;
  const sql = getSql();

  if (req.method === 'POST') {
    checkRateLimit(req, 'feedback');
    const rows = await sql`
      INSERT INTO feedback_submissions (name, email, type, related_tool, message, created_at)
      VALUES (${optionalText(body.name, 120)}, ${optionalText(body.email, 320)}, ${optionalText(body.type || 'suggestion', 40)}, ${optionalText(body.related_tool, 80)}, ${requireText(body.message, 'Message', MAX_FEEDBACK_BYTES)}, ${new Date()})
      RETURNING id, name, email, type, related_tool, message, created_at
    `;
    const record = rows[0];
    try {
      await sendFeedbackEmail(record);
    } catch (error) {
      console.error('Feedback email failed', error?.code || error?.name || 'unknown_error');
    }
    const user = await optionalAuthenticate(req);
    await recordAnalyticsEvent({
      userId: user?.id,
      eventName: 'feedback_submitted',
      eventGroup: 'feedback',
      tool: record.related_tool,
      metadata: { type: record.type },
    });
    return { id: record.id, status: 'received' };
  }

  if (req.method === 'GET') {
    const user = await authenticate(req);
    requireOwner(user);
    return sql`
      SELECT id, name, email, type, related_tool, message, created_at
      FROM feedback_submissions
      ORDER BY created_at DESC
      LIMIT 200
    `;
  }

  return null;
};

const handleHealth = async (res) => {
  const configured = Boolean(
    process.env.DATABASE_URL &&
      process.env.JWT_SECRET &&
      (process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID)
  );
  const checks = {
    configuration: configured ? 'ready' : 'incomplete',
    database: 'not_checked',
  };

  if (configured) {
    try {
      await getSql()`SELECT 1 AS ok`;
      checks.database = 'reachable';
    } catch (error) {
      checks.database = 'failed';
      checks.database_error_code = error.code || error.name || 'unknown';
    }
  }

  const healthy = checks.database === 'reachable';
  json(res, healthy ? 200 : 500, {
    status: healthy ? 'ok' : 'degraded',
    ...(healthy ? {} : { database: checks.database, database_error_code: checks.database_error_code || 'unknown' }),
  });
};

module.exports = async (req, res) => {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const rawPath = req.query.path ?? req.query['...path'];
    const pathParts = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean);
    const path = `/${pathParts.join('/')}`;
    if (req.method === 'GET' && path === '/health') {
      try {
        await handleHealth(res);
      } catch (error) {
        console.error('Health check error', {
          code: error.code || error.name || 'unknown_error',
          message: String(error.message || 'Health check failed').slice(0, 160),
        });
        json(res, 500, {
          status: 'degraded',
          database: 'failed',
          database_error_code: error.code || error.name || 'unknown',
        });
      }
      return;
    }

    const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
    const earlyResponse = await handleGoogleUser(req, path, body);
    if (earlyResponse) {
      if (earlyResponse?.token) {
        res.setHeader('Set-Cookie', authCookie(earlyResponse.token, req));
        json(res, 200, { user: earlyResponse.user });
        return;
      }
      json(res, 200, earlyResponse);
      return;
    }

    if (requiresAuthTokenBeforeSchema(req, path)) {
      verifyToken(requireRequestToken(req));
    }

    await ensureSchema();
    const response =
      (await handleAnalytics(req, path, body)) ||
      (await handleFeedback(req, path, body)) ||
      (await handleUsers(req, path, body)) ||
      (await handleNotes(req, path, body)) ||
      (await handleEncryptions(req, path, body));

    if (!response) {
      json(res, 404, { error: 'Route not found' });
      return;
    }

    if (response?.token) {
      res.setHeader('Set-Cookie', authCookie(response.token, req));
      json(res, 200, { user: response.user });
      return;
    }
    if (path === '/users/logout') {
      res.setHeader('Set-Cookie', clearAuthCookie(req));
    }
    json(res, 200, response);
  } catch (error) {
    const status = error.status || (TRANSIENT_DB_ERROR_CODES.has(error.code) ? 503 : 500);
    console.error('API error', {
      status,
      code: error.code || error.name || 'unknown_error',
      route: req.url,
    });
    json(res, status, { error: status === 500 ? 'Server error' : error.message });
  }
};
