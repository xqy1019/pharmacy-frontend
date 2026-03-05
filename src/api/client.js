import axios from 'axios';
import { AUTH_STORAGE_KEY, getStoredAuth } from '../utils/storage';

const client = axios.create({
  timeout: 12000
});

client.interceptors.request.use((config) => {
  const storedAuth = typeof window === 'undefined' ? null : getStoredAuth();

  return {
    ...config,
    headers: {
      'Content-Type': 'application/json',
      ...(storedAuth?.accessToken ? { Authorization: `Bearer ${storedAuth.accessToken}` } : {}),
      ...(storedAuth?.user?.id ? { 'x-user-id': String(storedAuth.user.id) } : {}),
      ...config.headers
    }
  };
});

client.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response;
    }

    const payload = response.data;
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
      if (payload.success) {
        return payload.data;
      }

      return Promise.reject(new Error(payload.message || '请求失败'));
    }

    return payload;
  },
  (error) => {
    if (error?.response?.status === 401) {
      // Token 过期或无效，清除本地认证状态并跳转登录页
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (_) { /* ignore */ }
      if (window.location.pathname !== '/login') {
        window.location.href = '/';
      }
    }

    const message =
      error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || '请求失败';

    return Promise.reject(new Error(message));
  }
);

export default client;
