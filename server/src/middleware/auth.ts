import type { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/http.js';

const publicPaths = new Set(['/api/auth/login', '/api/health']);

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (publicPaths.has(req.path)) {
    return next();
  }

  const token = req.header('x-access-token');
  if (!token) {
    return fail(res, 401, 'Missing access token.');
  }

  if (token.length === 0) {
    return fail(res, 401, 'Invalid access token.');
  }

  return next();
}
