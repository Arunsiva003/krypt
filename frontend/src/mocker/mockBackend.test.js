import { mockBackendAdapter, resetMockerData } from './mockBackend';

const request = (method, url, data, token) =>
  mockBackendAdapter({
    method,
    url,
    data: data ? JSON.stringify(data) : undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

describe('mockBackendAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockerData();
  });

  it('mimics auth and protected encryption history APIs', async () => {
    const login = await request('post', '/api/rust/users/login', {
      email: 'demo@krypt.local',
      password: 'demo-local-passphrase',
    });

    expect(login.data.user).toMatchObject({
      id: 1,
      username: 'demo',
      email: 'demo@krypt.local',
    });
    expect(login.data.user.password).toBeUndefined();

    const token = login.data.token;
    const savedText = await request('post', '/api/rust/text', { encrypted_text: 'mock-ciphertext' }, token);
    expect(savedText.data).toMatchObject({
      user_id: 1,
      username: 'demo',
      encrypted_text: 'mock-ciphertext',
      key_used: '[not stored]',
    });

    const textHistory = await request('get', '/api/rust/text', undefined, token);
    expect(textHistory.data[0].encrypted_text).toBe('mock-ciphertext');

    const counts = await request('get', '/api/rust/encryptions/counts', undefined, token);
    expect(counts.data).toMatchObject({
      text: 3,
      image: 2,
      textimage: 2,
    });

    const deleted = await request('delete', `/api/rust/text/${savedText.data.id}`, undefined, token);
    expect(deleted.data).toMatchObject({
      status: 'deleted',
      type: 'text',
      id: savedText.data.id,
    });
  });

  it('rejects unauthenticated and cross-user access', async () => {
    await expect(request('get', '/api/rust/text')).rejects.toMatchObject({
      response: { status: 401, data: { error: 'Authentication required' } },
    });

    const signup = await request('post', '/api/rust/users', {
      firstname: 'Second',
      lastname: 'User',
      username: 'second',
      email: 'second@krypt.local',
      password: 'demo-local-passphrase',
    });

    await expect(request('get', '/api/rust/users/1', undefined, signup.data.token)).rejects.toMatchObject({
      response: {
        status: 403,
        data: { error: 'You do not have access to this resource' },
      },
    });
  });

  it('accepts a real-shaped Google ID token in local mock mode', async () => {
    const encode = (value) =>
      btoa(JSON.stringify(value))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const credential = [
      encode({ alg: 'RS256', typ: 'JWT' }),
      encode({
        iss: 'https://accounts.google.com',
        aud: 'local-test-client',
        sub: 'google-user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: 'person@example.com',
        email_verified: true,
        given_name: 'Test',
        family_name: 'Person',
      }),
      'mock-signature',
    ].join('.');

    const login = await request('post', '/api/rust/users/google', { credential });

    expect(login.data.user).toMatchObject({
      firstname: 'Test',
      lastname: 'Person',
      email: 'person@example.com',
    });
    expect(login.data.token).toContain('mock-krypt-token');
  });
});
