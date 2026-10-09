/** Enlace entre HTTP y sesiones. Lee la cookie, exige una cuenta vigente
 * y comprueba el token CSRF en operaciones que modifican información. */
import type { Request, RequestHandler, Response } from 'express';
import type { Config } from '../../config.js';
import { ApiError } from '../../http/errors.js';
import { SESSION_MAX_AGE_MS, SessionService } from './sessions.js';
import type { SessionContext, SessionIssue } from './types.js';

export function cookieName(config: Config): string {
  return config.environment === 'production' ? '__Host-ensambla_session' : 'ensambla_session';
}

export function sessionCookie(req: Request, config: Config): string | undefined {
  const name = cookieName(config);
  const values = (req.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1));
  return values.length === 1 ? values[0] : undefined;
}

const cookieOptions = (config: Config) => ({
  httpOnly: true,
  secure: config.environment === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

export function clearSessionCookie(res: Response, config: Config): void {
  res.clearCookie(cookieName(config), cookieOptions(config));
}

export function sendSession(
  res: Response,
  config: Config,
  issued: SessionIssue,
  status = 200,
): void {
  res.cookie(cookieName(config), issued.token, {
    ...cookieOptions(config),
    maxAge: SESSION_MAX_AGE_MS,
  });
  res.status(status).json({ user: issued.context.user, csrfToken: issued.context.csrfToken });
}

export function requireSession(sessions: SessionService, config: Config): RequestHandler {
  return async (req, res, next) => {
    const context = await sessions.resolve(sessionCookie(req, config));
    if (!context) {
      clearSessionCookie(res, config);
      throw new ApiError(401, 'SESSION_REQUIRED', 'Iniciá sesión para continuar.');
    }
    res.locals.session = context;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      sessions.verifyCsrf(context, req.get('x-csrf-token'));
    }
    next();
  };
}

export function sessionContext(res: Response): SessionContext {
  return res.locals.session as SessionContext;
}
