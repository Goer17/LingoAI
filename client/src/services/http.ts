import axios from 'axios';
import type { ApiResponse } from '@/types/api';

const ACCESS_TOKEN_KEY = 'lingoai-access-token';

export function getStoredAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}

export function setStoredAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export const http = axios.create({
  baseURL: '/api',
});

http.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers['x-access-token'] = token;
  }
  return config;
});

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data.success) {
    throw new Error(response.data.error.message);
  }
  return response.data.data;
}
