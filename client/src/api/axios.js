// One Axios instance for the whole app. It adds the login token to every request and turns
// errors into friendly messages. The AI key is NOT here - the browser only ever talks to our backend.
import axios from 'axios';

export const TOKEN_KEY = 'lifelens_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 120000, // AI analysis can take a while
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthForm) {
      // Token missing/expired: tell AuthContext to log the user out.
      window.dispatchEvent(new Event('lifelens:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Returns a message that is safe and helpful to show to the user.
export function getErrorMessage(error, t) {
  if (error?.code === 'ECONNABORTED') return t('errors.timeout');
  if (!error?.response) return t('errors.network');
  return error.response.data?.message || t('errors.generic');
}

export default api;
