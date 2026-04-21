import fs from 'node:fs';
import { env } from '../config/env.js';

let cachedToken: string | null = null;

export function getAccessToken() {
  if (cachedToken) {
    return cachedToken;
  }

  cachedToken = fs.readFileSync(env.tokenPath, 'utf8').trim();
  return cachedToken;
}

export function validateAccessToken(token: string) {
  return token.trim() === getAccessToken();
}
