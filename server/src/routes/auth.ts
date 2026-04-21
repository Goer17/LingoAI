import { Router } from 'express';
import { validateAccessToken } from '../services/tokenService.js';
import { fail, ok } from '../utils/http.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const token = String(req.body?.token ?? '');
  if (!token) {
    return fail(res, 400, 'Token is required.');
  }

  if (!validateAccessToken(token)) {
    return fail(res, 401, 'Invalid token.');
  }

  return ok(res, { token });
});
