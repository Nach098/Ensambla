import { randomUUID } from 'node:crypto';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { Config } from '../config.js';

export interface AppDependencies {
  config: Config;
  checkReadiness: () => Promise<void>;
  log?: (event: Record<string, unknown>) => void;
}

export function createApp({ config, checkReadiness, log = event => console.log(JSON.stringify(event)) }: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  // Un único proxy confiable; activar sólo detrás del proxy HTTPS documentado.
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.use((req, res, next) => {
    const id = randomUUID();
    const started = performance.now();
    res.setHeader('X-Request-ID', id);
    res.locals.requestId = id;
    res.on('finish', () => log({ event: 'http_request', requestId: id, method: req.method,
      path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) }));
    next();
  });
  app.use(helmet({
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
  }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '256kb' }));
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await checkReadiness();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: {
    code: 'NOT_FOUND', message: 'El recurso no existe.', requestId: res.locals.requestId,
  } }));
  app.use(express.static(config.frontendPath, {
    dotfiles: 'deny',
    etag: true,
    setHeaders: res => { res.setHeader('Cache-Control', 'no-cache'); },
  }));
  app.use((_req, res) => res.status(404).type('text/plain').send('Recurso no encontrado.'));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
    const safeStatus = [400, 413, 415].includes(status) ? status : 500;
    if (safeStatus === 500) log({ level: 'error', event: 'http_error', requestId: res.locals.requestId });
    res.status(safeStatus).json({ error: {
      code: safeStatus === 413 ? 'PAYLOAD_TOO_LARGE' : safeStatus === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
      message: safeStatus === 500 ? 'No se pudo completar la solicitud.' : 'La solicitud no es válida.',
      requestId: res.locals.requestId,
    } });
  };
  app.use(errors);
  return app;
}
