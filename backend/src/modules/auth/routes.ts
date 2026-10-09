/** Endpoints de cuenta. Traduce solicitudes HTTP a casos de uso, controla
 * intentos y gestiona cookies; no contiene SQL ni lógica de permisos de espacios. */
import { Router } from 'express';
import type { Config } from '../../config.js';
import type { Database } from '../../database/database.js';
import { objectInput, textInput } from '../../http/validation.js';
import { AuthService } from './service.js';
import { RateLimiter } from './rate-limiter.js';
import { registerInput, loginInput, passwordChangeInput } from './validation.js';
import {
  clearSessionCookie,
  requireSession,
  sendSession,
  sessionCookie,
  sessionContext,
} from './middleware.js';

export function authRoutes(database: Database, config: Config, auth: AuthService): Router {
  const router = Router();
  const limiter = new RateLimiter(database);
  router.get('/session', async (req, res) => {
    const session = await auth.sessions.resolve(sessionCookie(req, config));
    res.json({ user: session?.user ?? null, csrfToken: session?.csrfToken ?? null });
  });
  router.post('/register', async (req, res) => {
    await limiter.hit('register-ip', req.ip ?? 'unknown', 10, 3600);
    const input = registerInput(req.body);
    sendSession(res, config, await auth.register(input, sessionCookie(req, config)), 201);
  });
  router.post('/login', async (req, res) => {
    await limiter.hit('login-ip', req.ip ?? 'unknown', 30, 900);
    const input = loginInput(req.body);
    await limiter.hit('login-email', input.email, 10, 900);
    sendSession(res, config, await auth.login(input, sessionCookie(req, config)));
  });

  router.use(requireSession(auth.sessions, config));
  router.post('/logout', async (req, res) => {
    await auth.sessions.revoke(sessionCookie(req, config));
    clearSessionCookie(res, config);
    res.status(204).end();
  });
  router.post('/logout-all', async (_req, res) => {
    await auth.sessions.revokeAll(sessionContext(res).user.id);
    clearSessionCookie(res, config);
    res.status(204).end();
  });
  router.patch('/profile', async (req, res) => {
    const body = objectInput(req.body, ['displayName']);
    const user = await auth.updateProfile(
      sessionContext(res).user.id,
      textInput(body.displayName, 'El nombre', 2),
    );
    res.json({ user });
  });
  router.post('/password', async (req, res) => {
    const user = sessionContext(res).user;
    await limiter.hit('password-user', user.id, 5, 900);
    const input = passwordChangeInput(req.body);
    await auth.changePassword(user.id, input.currentPassword, input.newPassword);
    clearSessionCookie(res, config);
    res.status(204).end();
  });
  return router;
}
