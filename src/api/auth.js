import client from './client';

export function login(payload) {
  return client.post('/api/v1/auth/login', payload);
}

export function getProfile() {
  return client.get('/api/v1/auth/me');
}
