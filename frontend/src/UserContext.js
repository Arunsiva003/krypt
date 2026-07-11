import { createContext, useState, useEffect } from 'react';
import api, { isMockerEnabled, readStoredAuth, setAuthToken, writeStoredAuth } from './api/client';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const mockMode = isMockerEnabled();
  const [auth, setAuthState] = useState(() => {
    const storedAuth = readStoredAuth();
    if (mockMode) {
      setAuthToken(storedAuth?.token);
      return storedAuth;
    }
    setAuthToken(null);
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(!mockMode);
  const user = auth?.user || null;
  const token = auth?.token || null;

  useEffect(() => {
    setAuthToken(token);
    writeStoredAuth(auth);
  }, [auth, token]);

  useEffect(() => {
    let active = true;
    if (mockMode) {
      setIsAuthLoading(false);
      return undefined;
    }
    api.get('/api/rust/users/me')
      .then((response) => {
        if (active) setAuthState({ user: response.data });
      })
      .catch(() => {
        if (active) setAuthState(null);
      })
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mockMode]);

  const setAuth = (nextAuth) => {
    const normalizedAuth = nextAuth?.user ? nextAuth : null;
    setAuthToken(normalizedAuth?.token);
    setIsAuthLoading(false);
    setAuthState(normalizedAuth);
  };

  const setUser = (nextUser) => {
    setAuthState((current) => (current && nextUser ? { ...current, user: nextUser } : null));
  };

  const logout = () => {
    if (!mockMode) {
      api.post('/api/rust/users/logout').catch(() => {});
    }
    setAuthToken(null);
    setIsAuthLoading(false);
    setAuthState(null);
  };

  return (
    <UserContext.Provider value={{ auth, user, token, isAuthenticated: Boolean(user), isAuthLoading, setAuth, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
