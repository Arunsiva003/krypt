# Krypt Frontend Mocker

The mocker is a browser-side mimic of the Rust backend. It lets the React app run without the backend, Postgres, or network API calls while preserving the same endpoint paths and response shapes used by the real API.

## Enable It

Set this environment value before starting the frontend:

```bash
REACT_APP_MOCKER_ENABLED=true
```

You can also turn it on at runtime in the browser console, then refresh:

```js
localStorage.setItem('isMockerEnabled', 'true');
```

Turn it off and refresh:

```js
localStorage.setItem('isMockerEnabled', 'false');
```

## Demo Account

- Email: `demo@krypt.local`
- Password: local demo passphrase from `mockBackend.js`

## Data Storage

Mock users and encryption history are stored in browser `localStorage` under `krypt_mocker_db`. To reset the mock database, remove that key or call:

```js
localStorage.removeItem('krypt_mocker_db');
```

When mocker mode is enabled, steganography save stores the generated browser data URL directly in mock history instead of requiring Cloudinary upload credentials.

## Supported API Surface

- `GET /health`
- `POST /api/rust/users`
- `POST /api/rust/users/login`
- `GET /api/rust/users/me`
- `GET /api/rust/users/:id`
- `PUT /api/rust/users/:id`
- `GET /api/rust/text`
- `POST /api/rust/text`
- `GET /api/rust/text/:userId`
- `DELETE /api/rust/text/:id`
- `GET /api/rust/image`
- `POST /api/rust/image`
- `GET /api/rust/image/:userId`
- `DELETE /api/rust/image/:id`
- `GET /api/rust/textimage`
- `POST /api/rust/textimage`
- `GET /api/rust/textimage/:userId`
- `DELETE /api/rust/textimage/:id`
- `GET /api/rust/encryptions/counts`
