import axios from 'axios';
import { getStoredAuth } from '../utils/storage';

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
    const message =
      error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || '请求失败';

    return Promise.reject(new Error(message));
  }
);

export default client;
