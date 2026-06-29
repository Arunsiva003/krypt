import { Pool } from 'pg';
import { Resend } from 'resend';

globalThis.__KRYPT_PG_PACKAGE = { Pool };
globalThis.__KRYPT_RESEND_PACKAGE = { Resend };

let vercelHandlerPromise;

const getVercelHandler = async () => {
  if (!vercelHandlerPromise) {
    vercelHandlerPromise = import('../../api/rust/[...path].js').then((module) => module.default || module);
  }
  return vercelHandlerPromise;
};

const syncNetlifyEnv = () => {
  const keys = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'REACT_APP_GOOGLE_CLIENT_ID',
    'KRYPT_OWNER_EMAILS',
    'KRYPT_OWNER_EMAIL',
    'FEEDBACK_NOTIFY_EMAIL',
    'RESEND_API_KEY',
    'FEEDBACK_FROM_EMAIL',
    'KRYPT_MAX_BODY_BYTES',
    'KRYPT_DB_SSL',
    'KRYPT_DB_SSL_REJECT_UNAUTHORIZED',
    'DATABASE_CA_CERT',
    'PGSSLROOTCERT',
  ];

  for (const key of keys) {
    const value = globalThis.Netlify?.env?.get?.(key);
    if (value && !process.env[key]) process.env[key] = value;
  }
};

const requestBody = async (request) => {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return {};
  const text = await request.text();
  if (!text) return {};
  const maxBytes = Number(process.env.KRYPT_MAX_BODY_BYTES || 5 * 1024 * 1024);
  if (new TextEncoder().encode(text).length > maxBytes) {
    const error = new Error('Request body is too large');
    error.status = 413;
    throw error;
  }
  return JSON.parse(text);
};

const netlifyResponse = () => {
  const response = {
    statusCode: 200,
    headers: new Headers(),
    body: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers.set(key, value);
      return this;
    },
    end(body) {
      this.body = body || '';
      return this;
    },
  };
  return response;
};

export default async (request) => {
  syncNetlifyEnv();

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/rust\/?/, '');
  const res = netlifyResponse();

  try {
    const req = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      query: {
        path: path ? path.split('/') : [],
      },
      body: await requestBody(request),
    };
    const vercelHandler = await getVercelHandler();
    await vercelHandler(req, res);
  } catch (error) {
    res.status(error.status || 500).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify({
      error: error.status === 413 ? error.message : 'Server error',
    }));
  }

  return new Response(res.body, {
    status: res.statusCode,
    headers: res.headers,
  });
};

export const config = {
  path: '/api/rust/*',
};
