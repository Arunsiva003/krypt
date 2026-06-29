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
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  feedback: { windowMs: 60 * 60 * 1000, max: 12 },
  write: { windowMs: 60 * 1000, max: 60 },
};

let pgPool;
let sqlClient;
let schemaReady;
const rateBuckets = new Map();

const databaseConnectionString = () => {
  try {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return process.env.DATABASE_URL;
  }
};

const json = (res, status, data) => {
  if (typeof res.status === 'function') {
    res.status(status);
  } else {
    res.statusCode = status;
  }
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
    pgPool = new Pool({
      connectionString: databaseConnectionString(),
      ssl,
      max: Number(process.env.KRYPT_DB_POOL_MAX || 5),
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
    await sql`CREATE INDEX IF NOT EXISTS text_to_text_user_id_idx ON text_to_text (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS image_to_image_user_id_idx ON image_to_image (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS text_to_image_user_id_idx ON text_to_image (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS secure_notes_user_id_idx ON secure_notes (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS feedback_submissions_created_at_idx ON feedback_submissions (created_at DESC)`;
  })();
  return schemaReady;
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

const authenticate = async (req) => {
  const authorization = req.headers.authorization || '';
  const token = cookieValue(req, 'krypt_session') || authorization.replace(/^Bearer\s+/i, '');
  const claims = verifyToken(token);
  const rows = await getSql()`SELECT id, firstname, lastname, username, email FROM users WHERE id = ${Number(claims.sub)} LIMIT 1`;
  if (!rows[0]) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return rows[0];
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

const listEncryption = async (bucket, user) => {
  const sql = getSql();
  if (bucket === 'text') {
    return sql`SELECT id, user_id, username, encrypted_text, key_used FROM text_to_text WHERE user_id = ${user.id} ORDER BY id DESC`;
  }
  if (bucket === 'image') {
    return sql`SELECT id, user_id, username, encrypted_image_link, key_used FROM image_to_image WHERE user_id = ${user.id} ORDER BY id DESC`;
  }
  return sql`SELECT id, user_id, username, encrypted_image_link, key_used FROM text_to_image WHERE user_id = ${user.id} ORDER BY id DESC`;
};

const saveEncryption = async (bucket, user, body) => {
  const sql = getSql();
  if (bucket === 'text') {
    const value = requireText(body.encrypted_text, 'Encrypted text', MAX_TEXT_BYTES);
    const rows = await sql`
      INSERT INTO text_to_text (user_id, username, encrypted_text, key_used)
      VALUES (${user.id}, ${user.username}, ${value}, ${KEY_NOT_STORED})
      RETURNING id, user_id, username, encrypted_text, key_used
    `;
    return rows[0];
  }

  const value = requireText(body.encrypted_image_link, 'Encrypted image', MAX_IMAGE_BYTES);
  if (bucket === 'image') {
    const rows = await sql`
      INSERT INTO image_to_image (user_id, username, encrypted_image_link, key_used)
      VALUES (${user.id}, ${user.username}, ${value}, ${KEY_NOT_STORED})
      RETURNING id, user_id, username, encrypted_image_link, key_used
    `;
    return rows[0];
  }

  const rows = await sql`
    INSERT INTO text_to_image (user_id, username, encrypted_image_link, key_used)
    VALUES (${user.id}, ${user.username}, ${value}, ${KEY_NOT_STORED})
    RETURNING id, user_id, username, encrypted_image_link, key_used
  `;
  return rows[0];
};

const deleteEncryption = async (bucket, user, id) => {
  const sql = getSql();
  if (bucket === 'text') return sql`DELETE FROM text_to_text WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
  if (bucket === 'image') return sql`DELETE FROM image_to_image WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
  return sql`DELETE FROM text_to_image WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
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
    }
    const token = signToken(user);
    return { user: publicUser(user), token };
  }

  if (req.method === 'GET' && path === '/users/me') {
    return publicUser(await authenticate(req));
  }

  if (req.method === 'POST' && path === '/users/logout') {
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
  }
  const token = signToken(user);
  return { user: publicUser(user), token };
};

const handleEncryptions = async (req, path, body) => {
  if (req.method === 'GET' && path === '/encryptions/counts') {
    const sql = getSql();
    const user = await authenticate(req);
    const [textRows, imageRows, textImageRows] = await Promise.all([
      sql`SELECT COUNT(*)::INT AS count FROM text_to_text WHERE user_id = ${user.id}`,
      sql`SELECT COUNT(*)::INT AS count FROM image_to_image WHERE user_id = ${user.id}`,
      sql`SELECT COUNT(*)::INT AS count FROM text_to_image WHERE user_id = ${user.id}`,
    ]);
    return { text: textRows[0].count, image: imageRows[0].count, textimage: textImageRows[0].count };
  }

  const collection = path.match(/^\/(text|image|textimage)(?:\/(\d+))?$/);
  if (!collection) return null;
  const user = await authenticate(req);
  const [, bucket, rawId] = collection;
  if (req.method === 'GET' && !rawId) return listEncryption(bucket, user);
  if (req.method === 'POST' && !rawId) {
    checkRateLimit(req, 'write');
    return saveEncryption(bucket, user, body);
  }
  if (req.method === 'DELETE' && rawId) {
    const rows = await deleteEncryption(bucket, user, Number(rawId));
    if (!rows[0]) throw Object.assign(new Error('Record not found'), { status: 404 });
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
    return rows[0];
  }

  const idMatch = path.match(/^\/notes\/(\d+)$/);
  if (idMatch && req.method === 'DELETE') {
    const rows = await sql`DELETE FROM secure_notes WHERE id = ${Number(idMatch[1])} AND user_id = ${user.id} RETURNING id`;
    if (!rows[0]) throw Object.assign(new Error('Note not found'), { status: 404 });
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
      INSERT INTO feedback_submissions (name, email, type, related_tool, message)
      VALUES (${optionalText(body.name, 120)}, ${optionalText(body.email, 320)}, ${optionalText(body.type || 'suggestion', 40)}, ${optionalText(body.related_tool, 80)}, ${requireText(body.message, 'Message', MAX_FEEDBACK_BYTES)})
      RETURNING id, name, email, type, related_tool, message, created_at
    `;
    const record = rows[0];
    try {
      await sendFeedbackEmail(record);
    } catch (error) {
      console.error('Feedback email failed', error?.code || error?.name || 'unknown_error');
    }
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
    const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const path = `/${pathParts.join('/')}`;
    if (req.method === 'GET' && path === '/health') {
      await handleHealth(res);
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

    await ensureSchema();
    const response =
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
    const status = error.status || 500;
    console.error('API error', {
      status,
      code: error.code || error.name || 'unknown_error',
      route: req.url,
    });
    json(res, status, { error: status === 500 ? 'Server error' : error.message });
  }
};
