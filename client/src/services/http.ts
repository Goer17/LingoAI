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

/** Surface the server's message for non-2xx responses too, so 400s do not
 *  degrade into axios' generic "Request failed with status code 400". */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const payload = (error as { response?: { data?: ApiResponse<unknown> } })?.response?.data;
    if (payload && payload.success === false && payload.error?.message) {
      return Promise.reject(new Error(payload.error.message));
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data.success) {
    throw new Error(response.data.error.message);
  }
  return response.data.data;
}
