/** Protege solicitudes que cambian datos: exige JSON, una cabecera propia
 * y el origen configurado. Evita aceptar formularios de sitios ajenos. */
import type { RequestHandler } from 'express';
import { ApiError } from './errors.js';

export function protectMutation(appOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    const source = req.get('origin');
    let origin = source;
    if (!source && req.get('referer')) {
      try {
        origin = new URL(req.get('referer')!).origin;
      } catch {
        origin = undefined;
      }
    }
    if (origin !== appOrigin || req.get('x-ensambla-request') !== '1') {
      throw new ApiError(403, 'INVALID_ORIGIN', 'La solicitud debe realizarse desde Ensambla.');
    }
    if (!req.is('application/json')) {
      throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'La solicitud debe usar JSON.');
    }
    next();
  };
}
