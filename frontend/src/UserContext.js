import { createContext, useState, useEffect } from 'react';
import api, { isMockerEnabled, readStoredAuth, setAuthToken, writeStoredAuth } from './api/client';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [auth, setAuthState] = useState(() => {
    const storedAuth = readStoredAuth();
    setAuthToken(storedAuth?.token);
    return storedAuth;
  });
  const user = auth?.user || null;
  const token = auth?.token || null;

  useEffect(() => {
    setAuthToken(token);
    writeStoredAuth(auth);
  }, [auth, token]);

  useEffect(() => {
    let active = true;
    if (isMockerEnabled()) return undefined;
    api.get('/api/rust/users/me')
      .then((response) => {
        if (active) setAuthState({ user: response.data });
      })
      .catch(() => {
        if (active) setAuthState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const setAuth = (nextAuth) => {
    const normalizedAuth = nextAuth?.user ? nextAuth : null;
    setAuthToken(normalizedAuth?.token);
    setAuthState(normalizedAuth);
  };

  const setUser = (nextUser) => {
    setAuthState((current) => (current && nextUser ? { ...current, user: nextUser } : null));
  };

  const logout = () => {
    if (!isMockerEnabled()) {
      api.post('/api/rust/users/logout').catch(() => {});
    }
    setAuthToken(null);
    setAuthState(null);
  };

  return (
    <UserContext.Provider value={{ auth, user, token, isAuthenticated: Boolean(user), setAuth, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
