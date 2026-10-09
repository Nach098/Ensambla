/** Compone el servidor HTTP: cabeceras, cuentas, permisos, errores y archivos
 * públicos. Los casos de uso y las consultas viven en sus propios módulos. */
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { Config } from '../config.js';
import type { Database } from '../database/database.js';
import { ApiError } from './errors.js';
import { protectMutation } from './security.js';
import { AuthService } from '../modules/auth/service.js';
import { authRoutes } from '../modules/auth/routes.js';
import { workspaceRoutes } from '../modules/workspaces/routes.js';

export interface AppDependencies {
  config: Config;
  checkReadiness: () => Promise<void>;
  log?: (event: Record<string, unknown>) => void;
  database?: Database;
}

export function createApp({
  config,
  checkReadiness,
  database,
  log = (event) => console.log(JSON.stringify(event)),
}: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  // Un único proxy confiable; activar sólo detrás del proxy HTTPS documentado.
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.use((req, res, next) => {
    const id = randomUUID();
    const started = performance.now();
    res.setHeader('X-Request-ID', id);
    res.locals.requestId = id;
    res.on('finish', () =>
      log({
        event: 'http_request',
        requestId: id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          workerSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.environment === 'production' ? [] : null,
        },
      },
      strictTransportSecurity: config.environment === 'production',
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/auth', protectMutation(config.appOrigin));
  app.use('/api/workspaces', protectMutation(config.appOrigin));
  app.use('/api', express.json({ limit: '256kb', strict: true }));
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await checkReadiness();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  if (database) {
    const auth = new AuthService(database);
    app.use('/api/auth', authRoutes(database, config, auth));
    app.use('/api/workspaces', workspaceRoutes(database, config, auth));
  }
  app.use('/api', (_req, res) =>
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'El recurso no existe.',
        requestId: res.locals.requestId,
      },
    }),
  );
  app.use(
    express.static(config.frontendPath, {
      dotfiles: 'deny',
      etag: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  app.use((_req, res) => res.status(404).type('text/plain').send('Recurso no encontrado.'));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
    const safeStatus =
      error instanceof ApiError ? error.status : [400, 413, 415].includes(status) ? status : 500;
    if (error instanceof ApiError && error.retryAfter)
      res.setHeader('Retry-After', error.retryAfter);
    if (safeStatus === 500)
      log({ level: 'error', event: 'http_error', requestId: res.locals.requestId });
    res.status(safeStatus).json({
      error: {
        code:
          error instanceof ApiError
            ? error.code
            : safeStatus === 413
              ? 'PAYLOAD_TOO_LARGE'
              : safeStatus === 500
                ? 'INTERNAL_ERROR'
                : 'INVALID_REQUEST',
        message:
          error instanceof ApiError
            ? error.message
            : safeStatus === 500
              ? 'No se pudo completar la solicitud.'
              : 'La solicitud no es válida.',
        requestId: res.locals.requestId,
      },
    });
  };
  app.use(errors);
  return app;
}
