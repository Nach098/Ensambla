/** Limita intentos de acceso y registro con contadores atómicos en PostgreSQL.
 * Las claves se hashean para no guardar correos o direcciones IP en la tabla. */
import { createHash } from 'node:crypto';
import type { Database } from '../../database/database.js';
import { ApiError } from '../../http/errors.js';

export class RateLimiter {
  constructor(private readonly database: Database) {}

  async hit(scope: string, identity: string, limit: number, seconds: number): Promise<void> {
    const key = createHash('sha256').update(`${scope}:${identity}`).digest('hex');
    const result = await this.database.query(
      `INSERT INTO auth_rate_limits(key_hash, attempts, reset_at)
      VALUES ($1, 1, now() + $2 * interval '1 second')
      ON CONFLICT (key_hash) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.reset_at <= now() THEN 1 ELSE auth_rate_limits.attempts + 1 END,
        reset_at = CASE WHEN auth_rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE auth_rate_limits.reset_at END
      RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM reset_at - now()))) AS remaining`,
      [key, seconds],
    );
    const row = result.rows[0]!;
    if (Number(row.attempts) > limit) {
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Se hicieron demasiados intentos. Esperá antes de volver a probar.',
        Number(row.remaining),
      );
    }
  }
}
