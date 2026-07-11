import { AxiosError } from 'axios';

const MOCK_DB_STORAGE_KEY = 'krypt_mocker_db';
const MOCK_TOKEN_PREFIX = 'mock-krypt-token';
const KEY_NOT_STORED = '[not stored]';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const MOCK_OWNER_EMAILS = String(process.env.REACT_APP_MOCK_OWNER_EMAILS || process.env.REACT_APP_KRYPT_OWNER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ANALYTICS_BLOCKED_METADATA_KEY = /(cipher|content|credential|email|file|image|key|message|note|password|payload|plain|secret|text|token)/i;

const DEMO_USER = {
  id: 1,
  firstname: 'Demo',
  lastname: 'User',
  username: 'demo',
  email: 'demo@krypt.local',
  password: 'demo-local-passphrase',
};

const SAMPLE_IMAGE_SVG = `
  <svg width="640" height="360" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
    <rect width="640" height="360" fill="#0f172a"/>
    <rect x="64" y="56" width="512" height="248" rx="24" fill="#1e293b"/>
    <circle cx="208" cy="176" r="56" fill="#38bdf8"/>
    <circle cx="320" cy="176" r="56" fill="#34d599"/>
    <circle cx="432" cy="176" r="56" fill="#f59e0b"/>
    <text x="320" y="270" font-family="Arial, sans-serif" font-size="30" fill="#e8f0ff" text-anchor="middle">
      Krypt mock image
    </text>
  </svg>
`;
const SAMPLE_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_IMAGE_SVG)}`;

const createSeedDb = () => ({
  nextUserId: 2,
  nextTextId: 3,
  nextImageId: 3,
  nextTextImageId: 3,
  nextNoteId: 1,
  nextFeedbackId: 1,
  nextAnalyticsId: 1,
  users: [DEMO_USER],
  text: [
    {
      id: 2,
      user_id: 1,
      username: 'demo',
      encrypted_text: 'mock-ciphertext-sample-from-local-backend',
      key_used: KEY_NOT_STORED,
    },
    {
      id: 1,
      user_id: 1,
      username: 'demo',
      encrypted_text: 'mock-ciphertext-history-example',
      key_used: KEY_NOT_STORED,
    },
  ],
  image: [
    {
      id: 2,
      user_id: 1,
      username: 'demo',
      encrypted_image_link: SAMPLE_IMAGE,
      key_used: KEY_NOT_STORED,
    },
    {
      id: 1,
      user_id: 1,
      username: 'demo',
      encrypted_image_link: SAMPLE_IMAGE,
      key_used: KEY_NOT_STORED,
    },
  ],
  textimage: [
    {
      id: 2,
      user_id: 1,
      username: 'demo',
      encrypted_image_link: SAMPLE_IMAGE,
      key_used: KEY_NOT_STORED,
    },
    {
      id: 1,
      user_id: 1,
      username: 'demo',
      encrypted_image_link: SAMPLE_IMAGE,
      key_used: KEY_NOT_STORED,
    },
  ],
  notes: [],
  feedback: [],
  analytics: [],
});

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const clone = (value) => JSON.parse(JSON.stringify(value));

const readDb = () => {
  if (!canUseStorage()) return createSeedDb();

  try {
    const stored = window.localStorage.getItem(MOCK_DB_STORAGE_KEY);
    if (stored) return normalizeDb(JSON.parse(stored));
  } catch {
    window.localStorage.removeItem(MOCK_DB_STORAGE_KEY);
  }

  const seed = createSeedDb();
  writeDb(seed);
  return seed;
};

const normalizeDb = (db) => ({
  ...createSeedDb(),
  ...db,
  notes: db.notes || [],
  feedback: db.feedback || [],
  analytics: db.analytics || [],
  nextNoteId: db.nextNoteId || 1,
  nextFeedbackId: db.nextFeedbackId || 1,
  nextAnalyticsId: db.nextAnalyticsId || 1,
});

const writeDb = (db) => {
  if (canUseStorage()) {
    window.localStorage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(db));
  }
};

const publicUser = (user) => ({
  id: user.id,
  firstname: user.firstname,
  lastname: user.lastname,
  username: user.username,
  email: user.email,
  is_owner: MOCK_OWNER_EMAILS.length
    ? MOCK_OWNER_EMAILS.includes(String(user.email || '').toLowerCase())
    : user.email === DEMO_USER.email,
});

const normalizeMethod = (method) => (method || 'get').toUpperCase();

const parseBody = (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
};

const getPath = (url = '') => {
  try {
    return new URL(url, 'http://mock.krypt.local').pathname;
  } catch {
    return url.split('?')[0];
  }
};

const createToken = (user) => `${MOCK_TOKEN_PREFIX}:${user.id}:${user.username}`;

const userFromToken = (db, config) => {
  const headers = config.headers || {};
  const authorization =
    headers.Authorization ||
    headers.authorization ||
    headers.get?.('Authorization') ||
    headers.get?.('authorization') ||
    '';
  const token = authorization.replace(/^Bearer\s+/i, '');

  if (!token.startsWith(`${MOCK_TOKEN_PREFIX}:`)) return null;

  const [, rawId] = token.split(':');
  const userId = Number(rawId);
  return db.users.find((user) => user.id === userId) || null;
};

const makeResponse = (config, data, status = 200) => ({
  data: clone(data),
  status,
  statusText: status >= 400 ? 'Error' : 'OK',
  headers: {},
  config,
  request: null,
});

const makeError = (config, status, message) => {
  const response = makeResponse(config, { error: message }, status);
  return new AxiosError(message, undefined, config, null, response);
};

const requireAuth = (db, config) => {
  const user = userFromToken(db, config);
  if (!user) {
    throw makeError(config, 401, 'Authentication required');
  }
  return user;
};

const requireOwner = (db, config) => {
  const user = requireAuth(db, config);
  if (!publicUser(user).is_owner) {
    throw makeError(config, 403, 'Owner access required');
  }
  return user;
};

const safeLabel = (value, fallback = 'event', maxLength = 80) => {
  const text = String(value || '').trim().slice(0, maxLength);
  return text ? text.replace(/[^a-zA-Z0-9_.:-]/g, '_') : fallback;
};

const sanitizeAnalyticsMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.entries(metadata).slice(0, 20).reduce((clean, [key, value]) => {
    const safeKey = String(key || '').trim().replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 50);
    if (!safeKey || ANALYTICS_BLOCKED_METADATA_KEY.test(safeKey)) return clean;
    if (typeof value === 'boolean') return { ...clean, [safeKey]: value };
    if (typeof value === 'number' && Number.isFinite(value)) return { ...clean, [safeKey]: value };
    if (typeof value === 'string') {
      const safeValue = value.trim().slice(0, 120);
      return safeValue ? { ...clean, [safeKey]: safeValue } : clean;
    }
    return clean;
  }, {});
};

const recordAnalyticsEvent = (db, config, payload, user = userFromToken(db, config)) => {
  const event = {
    id: db.nextAnalyticsId,
    user_id: user?.id || null,
    event_name: safeLabel(payload.event_name),
    event_group: safeLabel(payload.event_group || 'app', 'app', 40),
    path: payload.path ? String(payload.path).slice(0, 160) : '',
    tool: payload.tool ? safeLabel(payload.tool) : '',
    metadata: sanitizeAnalyticsMetadata(payload.metadata),
    created_at: new Date().toISOString(),
  };
  db.nextAnalyticsId += 1;
  db.analytics.unshift(event);
  db.analytics = db.analytics.slice(0, 1000);
  writeDb(db);
  return event;
};

const countWhere = (items, predicate = () => true) => items.filter(predicate).length;

const aggregateBy = (items, key, limit = 12) =>
  Object.entries(items.reduce((acc, item) => {
    const value = key(item) || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {}))
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);

const analyticsSummary = (db) => {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const events = db.analytics || [];
  const eventTime = (event) => new Date(event.created_at).getTime();
  const eventsToday = events.filter((event) => eventTime(event) >= startOfToday.getTime());
  const eventsLast7Days = events.filter((event) => eventTime(event) >= sevenDaysAgo);
  const activeUsers = (items) => new Set(items.map((event) => event.user_id).filter(Boolean)).size;
  const authEvents = (names, items) => countWhere(items, (event) => names.includes(event.event_name));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - (6 - index));
    const day = date.toISOString().slice(0, 10);
    const dayEvents = events.filter((event) => String(event.created_at || '').slice(0, 10) === day);
    return {
      day,
      events: dayEvents.length,
      users: activeUsers(dayEvents),
    };
  });

  return {
    generated_at: new Date().toISOString(),
    totals: {
      users: db.users.length,
      events: events.length,
      eventsToday: eventsToday.length,
      eventsLast7Days: eventsLast7Days.length,
      feedback: db.feedback.length,
      savedText: db.text.length,
      savedImages: db.image.length,
      savedTextImages: db.textimage.length,
      notes: db.notes.length,
    },
    activeUsers: {
      today: activeUsers(eventsToday),
      last7Days: activeUsers(eventsLast7Days),
    },
    logins: {
      today: authEvents(['login', 'google_login'], eventsToday),
      last7Days: authEvents(['login', 'google_login'], eventsLast7Days),
      all: authEvents(['login', 'google_login'], events),
    },
    signups: {
      today: authEvents(['signup', 'google_signup'], eventsToday),
      last7Days: authEvents(['signup', 'google_signup'], eventsLast7Days),
      all: authEvents(['signup', 'google_signup'], events),
    },
    eventBreakdown: aggregateBy(eventsLast7Days, (event) => event.event_name).map((item) => ({ event_name: item.value, count: item.count })),
    toolBreakdown: aggregateBy(eventsLast7Days.filter((event) => event.tool), (event) => event.tool).map((item) => ({ tool: item.value, count: item.count })),
    deviceBreakdown: aggregateBy(eventsLast7Days, (event) => event.metadata?.device_type).map((item) => ({ device_type: item.value, count: item.count })),
    dailyEvents: days,
    recentEvents: events.slice(0, 40).map((event) => {
      const user = db.users.find((item) => item.id === event.user_id);
      return {
        ...event,
        username: user?.username || '',
        email: user?.email || '',
      };
    }),
  };
};

const validateRequired = (config, value, label) => {
  if (!String(value || '').trim()) {
    throw makeError(config, 400, `${label} is required`);
  }
};

const validatePassword = (config, password) => {
  validateRequired(config, password, 'Password');
  if (password.length < 8) {
    throw makeError(config, 400, 'Password must be at least 8 characters');
  }
};

const decodeGoogleCredential = (config, credential) => {
  if (credential === 'mock-google-credential') {
    return {
      sub: 'mock-google-sub',
      email: 'google.demo@krypt.local',
      email_verified: true,
      given_name: 'Google',
      family_name: 'Demo',
      aud: GOOGLE_CLIENT_ID,
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  try {
    const segments = credential.split('.');
    if (segments.length !== 3) throw new Error('Invalid JWT');
    const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = window.atob(padded);
    const json = decodeURIComponent(
      Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
    const claims = JSON.parse(json);
    const validIssuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
    const validAudience = !GOOGLE_CLIENT_ID || claims.aud === GOOGLE_CLIENT_ID;
    const validExpiry = Number(claims.exp) > Math.floor(Date.now() / 1000);

    if (!claims.sub || !claims.email || claims.email_verified !== true || !validIssuer || !validAudience || !validExpiry) {
      throw new Error('Invalid Google claims');
    }
    return claims;
  } catch {
    throw makeError(config, 401, 'Google credential could not be validated in local mock mode');
  }
};

const googleUsername = (db, email) => {
  const base =
    email
      .split('@')[0]
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase() || 'google';
  const usernames = new Set(db.users.map((user) => user.username.toLowerCase()));
  let candidate = base;
  let suffix = 1;
  while (usernames.has(candidate.toLowerCase())) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const handleAnalytics = (db, config, method, path, payload) => {
  if (!path.startsWith('/api/rust/analytics')) return null;

  if (method === 'POST' && path === '/api/rust/analytics/events') {
    recordAnalyticsEvent(db, config, payload);
    return makeResponse(config, { status: 'recorded' });
  }

  if (method === 'GET' && path === '/api/rust/analytics/summary') {
    requireOwner(db, config);
    return makeResponse(config, analyticsSummary(db));
  }

  return null;
};

const findRecordBucket = (path) => {
  if (path.startsWith('/api/rust/textimage')) return 'textimage';
  if (path.startsWith('/api/rust/image')) return 'image';
  if (path.startsWith('/api/rust/text')) return 'text';
  return null;
};

const listRecords = (db, bucket, userId) =>
  db[bucket].filter((record) => record.user_id === userId).sort((a, b) => b.id - a.id);

const saveRecord = (db, bucket, user, payload) => {
  const idKey = bucket === 'text' ? 'nextTextId' : bucket === 'image' ? 'nextImageId' : 'nextTextImageId';
  const content =
    bucket === 'text'
      ? { encrypted_text: payload.encrypted_text }
      : { encrypted_image_link: payload.encrypted_image_link };

  const record = {
    id: db[idKey],
    user_id: user.id,
    username: user.username,
    ...content,
    key_used: KEY_NOT_STORED,
  };

  db[idKey] += 1;
  db[bucket].unshift(record);
  writeDb(db);
  return record;
};

const deleteRecord = (db, bucket, id, user) => {
  const index = db[bucket].findIndex((record) => record.id === id && record.user_id === user.id);
  if (index === -1) return false;
  db[bucket].splice(index, 1);
  writeDb(db);
  return true;
};

const handleUsers = (db, config, method, path, payload) => {
  if (method === 'POST' && path === '/api/rust/users') {
    validateRequired(config, payload.firstname, 'First name');
    validateRequired(config, payload.lastname, 'Last name');
    validateRequired(config, payload.username, 'Username');
    validateRequired(config, payload.email, 'Email');
    validatePassword(config, payload.password);

    const email = payload.email.toLowerCase();
    const username = payload.username.toLowerCase();
    const existing = db.users.find(
      (user) => user.email.toLowerCase() === email || user.username.toLowerCase() === username,
    );
    if (existing) throw makeError(config, 409, 'Email or username already exists');

    const user = {
      id: db.nextUserId,
      firstname: payload.firstname,
      lastname: payload.lastname,
      username: payload.username,
      email: payload.email,
      password: payload.password,
    };
    db.nextUserId += 1;
    db.users.push(user);
    writeDb(db);
    recordAnalyticsEvent(db, config, {
      event_name: 'signup',
      event_group: 'auth',
      metadata: { method: 'password' },
    }, user);

    return makeResponse(config, { user: publicUser(user), token: createToken(user) });
  }

  if (method === 'POST' && path === '/api/rust/users/login') {
    validateRequired(config, payload.email, 'Email');
    validateRequired(config, payload.password, 'Password');
    const user = db.users.find((item) => item.email.toLowerCase() === payload.email.toLowerCase());
    if (!user || user.password !== payload.password) {
      throw makeError(config, 401, 'Authentication required');
    }
    recordAnalyticsEvent(db, config, {
      event_name: 'login',
      event_group: 'auth',
      metadata: { method: 'password' },
    }, user);
    return makeResponse(config, { user: publicUser(user), token: createToken(user) });
  }

  if (method === 'POST' && path === '/api/rust/users/google') {
    validateRequired(config, payload.credential, 'Google credential');
    const profile = decodeGoogleCredential(config, payload.credential);
    let user = db.users.find(
      (item) => item.google_sub === profile.sub || item.email.toLowerCase() === profile.email.toLowerCase(),
    );
    let createdGoogleUser = false;
    if (!user) {
      user = {
        id: db.nextUserId,
        firstname: profile.given_name || profile.name || 'Google',
        lastname: profile.family_name || 'User',
        username: googleUsername(db, profile.email),
        email: profile.email,
        password: '',
        google_sub: profile.sub,
      };
      db.nextUserId += 1;
      db.users.push(user);
      createdGoogleUser = true;
    } else {
      user.google_sub = profile.sub;
    }
    writeDb(db);
    recordAnalyticsEvent(db, config, {
      event_name: createdGoogleUser ? 'google_signup' : 'google_login',
      event_group: 'auth',
      metadata: { method: 'google' },
    }, user);
    return makeResponse(config, { user: publicUser(user), token: createToken(user) });
  }

  if (method === 'POST' && path === '/api/rust/users/logout') {
    const user = userFromToken(db, config);
    recordAnalyticsEvent(db, config, {
      event_name: 'logout',
      event_group: 'auth',
    }, user);
    return makeResponse(config, { status: 'signed_out' });
  }

  if (method === 'GET' && path === '/api/rust/users/me') {
    const user = requireAuth(db, config);
    return makeResponse(config, publicUser(user));
  }

  const userMatch = path.match(/^\/api\/rust\/users\/(\d+)$/);
  if (userMatch) {
    const currentUser = requireAuth(db, config);
    const requestedId = Number(userMatch[1]);
    if (currentUser.id !== requestedId) {
      throw makeError(config, 403, 'You do not have access to this resource');
    }

    if (method === 'GET') {
      return makeResponse(config, publicUser(currentUser));
    }

    if (method === 'PUT') {
      if (payload.password?.trim()) validatePassword(config, payload.password);
      currentUser.firstname = payload.firstname ?? currentUser.firstname;
      currentUser.lastname = payload.lastname ?? currentUser.lastname;
      currentUser.password = payload.password?.trim() ? payload.password : currentUser.password;
      writeDb(db);
      recordAnalyticsEvent(db, config, {
        event_name: 'profile_update',
        event_group: 'auth',
        metadata: { password_changed: Boolean(payload.password?.trim()) },
      }, currentUser);
      return makeResponse(config, publicUser(currentUser));
    }
  }

  return null;
};

const handleEncryptions = (db, config, method, path, payload) => {
  if (method === 'GET' && path === '/api/rust/encryptions/counts') {
    const user = requireAuth(db, config);
    return makeResponse(config, {
      text: listRecords(db, 'text', user.id).length,
      image: listRecords(db, 'image', user.id).length,
      textimage: listRecords(db, 'textimage', user.id).length,
    });
  }

  const bucket = findRecordBucket(path);
  if (!bucket) return null;

  const user = requireAuth(db, config);
  const collectionPath =
    bucket === 'textimage' ? '/api/rust/textimage' : bucket === 'image' ? '/api/rust/image' : '/api/rust/text';

  if (method === 'GET' && path === collectionPath) {
    return makeResponse(config, listRecords(db, bucket, user.id));
  }

  if (method === 'POST' && path === collectionPath) {
    if (bucket === 'text') {
      validateRequired(config, payload.encrypted_text, 'Encrypted text');
    } else {
      validateRequired(config, payload.encrypted_image_link, 'Encrypted image');
    }
    const saved = saveRecord(db, bucket, user, payload);
    recordAnalyticsEvent(db, config, {
      event_name: `save_${bucket}`,
      event_group: 'storage',
      tool: bucket,
    }, user);
    return makeResponse(config, saved);
  }

  const idMatch = path.match(new RegExp(`^${collectionPath}/(\\d+)$`));
  if (idMatch && method === 'GET') {
    const requestedUserId = Number(idMatch[1]);
    if (requestedUserId !== user.id) {
      throw makeError(config, 403, 'You do not have access to this resource');
    }
    return makeResponse(config, listRecords(db, bucket, user.id));
  }

  if (idMatch && method === 'DELETE') {
    const id = Number(idMatch[1]);
    if (!deleteRecord(db, bucket, id, user)) {
      throw makeError(config, 404, 'Record not found');
    }
    recordAnalyticsEvent(db, config, {
      event_name: `delete_${bucket}`,
      event_group: 'storage',
      tool: bucket,
    }, user);
    return makeResponse(config, {
      status: 'deleted',
      type: bucket,
      id,
    });
  }

  return null;
};

const handleNotes = (db, config, method, path, payload) => {
  if (!path.startsWith('/api/rust/notes')) return null;
  const user = requireAuth(db, config);

  if (method === 'GET' && path === '/api/rust/notes') {
    return makeResponse(config, db.notes.filter((note) => note.user_id === user.id).sort((a, b) => b.id - a.id));
  }

  if (method === 'POST' && path === '/api/rust/notes') {
    validateRequired(config, payload.title, 'Title');
    validateRequired(config, payload.ciphertext, 'Ciphertext');
    const note = {
      id: db.nextNoteId,
      user_id: user.id,
      title: payload.title,
      ciphertext: payload.ciphertext,
      algorithm: payload.algorithm,
      kdf: payload.kdf,
      iterations: payload.iterations,
      salt: payload.salt,
      iv: payload.iv,
    };
    db.nextNoteId += 1;
    db.notes.unshift(note);
    writeDb(db);
    recordAnalyticsEvent(db, config, {
      event_name: 'note_save',
      event_group: 'storage',
      tool: 'secure-notes',
      metadata: { algorithm: payload.algorithm || 'AES-GCM', kdf: payload.kdf || 'PBKDF2' },
    }, user);
    return makeResponse(config, note);
  }

  const idMatch = path.match(/^\/api\/rust\/notes\/(\d+)$/);
  if (idMatch && method === 'DELETE') {
    const id = Number(idMatch[1]);
    const index = db.notes.findIndex((note) => note.id === id && note.user_id === user.id);
    if (index === -1) throw makeError(config, 404, 'Note not found');
    db.notes.splice(index, 1);
    writeDb(db);
    recordAnalyticsEvent(db, config, {
      event_name: 'note_delete',
      event_group: 'storage',
      tool: 'secure-notes',
    }, user);
    return makeResponse(config, { status: 'deleted', type: 'note', id });
  }

  return null;
};

const handleFeedback = (db, config, method, path, payload) => {
  if (!(method === 'POST' && path === '/api/rust/feedback')) return null;
  validateRequired(config, payload.message, 'Message');
  const record = {
    id: db.nextFeedbackId,
    name: payload.name || '',
    email: payload.email || '',
    type: payload.type || 'suggestion',
    related_tool: payload.related_tool || '',
    message: payload.message,
  };
  db.nextFeedbackId += 1;
  db.feedback.unshift(record);
  writeDb(db);
  recordAnalyticsEvent(db, config, {
    event_name: 'feedback_submitted',
    event_group: 'feedback',
    tool: record.related_tool,
    metadata: { type: record.type },
  });
  return makeResponse(config, { id: record.id, status: 'received' });
};

export const isMockerEnabled = () => {
  if (process.env.NODE_ENV === 'production') return false;

  if (canUseStorage()) {
    const runtimeValue = window.localStorage.getItem('isMockerEnabled');
    if (runtimeValue !== null) return runtimeValue === 'true';
  }

  return process.env.REACT_APP_MOCKER_ENABLED === 'true';
};

export const resetMockerData = () => {
  if (canUseStorage()) {
    window.localStorage.removeItem(MOCK_DB_STORAGE_KEY);
  }
};

export const mockBackendAdapter = async (config) => {
  const db = readDb();
  const method = normalizeMethod(config.method);
  const path = getPath(config.url);
  const payload = parseBody(config.data);

  try {
    if (method === 'GET' && (path === '/' || path === '/health')) {
      return makeResponse(config, { status: 'ok', service: 'krypt-mocker' });
    }

    const analyticsResponse = handleAnalytics(db, config, method, path, payload);
    if (analyticsResponse) return analyticsResponse;

    const userResponse = handleUsers(db, config, method, path, payload);
    if (userResponse) return userResponse;

    const encryptionResponse = handleEncryptions(db, config, method, path, payload);
    if (encryptionResponse) return encryptionResponse;

    const notesResponse = handleNotes(db, config, method, path, payload);
    if (notesResponse) return notesResponse;

    const feedbackResponse = handleFeedback(db, config, method, path, payload);
    if (feedbackResponse) return feedbackResponse;

    throw makeError(config, 404, `Mock route not found: ${method} ${path}`);
  } catch (error) {
    return Promise.reject(error);
  }
};
