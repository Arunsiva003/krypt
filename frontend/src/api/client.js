import axios from 'axios';
import { isMockerEnabled, mockBackendAdapter } from '../mocker/mockBackend';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const AUTH_STORAGE_KEY = 'krypt_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  adapter: isMockerEnabled() ? mockBackendAdapter : undefined,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (isMockerEnabled() && token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const readStoredAuth = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const legacy = localStorage.getItem('krypt_auth');
    if (legacy) localStorage.removeItem('krypt_auth');
    const user = stored ? JSON.parse(stored) : null;
    return user ? { user } : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeStoredAuth = (auth) => {
  if (auth?.user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth.user));
    localStorage.removeItem('user');
    localStorage.removeItem('krypt_auth');
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('krypt_auth');
  }
};

api.interceptors.request.use((config) => {
  if (!config.headers?.Authorization) {
    const storedAuth = isMockerEnabled() ? readStoredAuth() : null;
    if (storedAuth?.token) {
      config.headers.Authorization = `Bearer ${storedAuth.token}`;
    }
  }
  return config;
});

export const authStorageKey = AUTH_STORAGE_KEY;
export const apiBaseUrl = API_BASE_URL;
export { isMockerEnabled };

export default api;
