/** Sesiones persistentes: emite tokens aleatorios, guarda sólo su hash y
 * verifica caducidad y estado de cuenta. También revoca sesiones y protege CSRF. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Database } from '../../database/database.js';
import type { Connection } from '../../database/migrations.js';
import { ApiError } from '../../http/errors.js';
import { accountFromRow } from './repository.js';
import { publicUser } from './types.js';
import type { PublicUser, SessionContext, SessionIssue } from './types.js';

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class SessionService {
  constructor(private readonly database: Database) {}

  async issue(connection: Connection, user: PublicUser): Promise<SessionIssue> {
    const token = randomBytes(32).toString('base64url');
    const context = {
      user: publicUser(user),
      tokenHash: tokenHash(token),
      csrfToken: randomBytes(32).toString('base64url'),
    };
    await connection.query(
      `INSERT INTO auth_sessions(token_hash, user_id, csrf_token, expires_at)
      VALUES ($1, $2, $3, now() + interval '7 days')`,
      [context.tokenHash, user.id, context.csrfToken],
    );
    return { token, context };
  }

  async resolve(token: string | undefined): Promise<SessionContext | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const hash = tokenHash(token);
    const result = await this.database.query(
      `SELECT u.*, s.csrf_token FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      AND s.last_seen_at > now() - interval '12 hours' AND u.disabled_at IS NULL`,
      [hash],
    );
    const row = result.rows[0];
    if (!row) return null;
    await this.database.query(
      `UPDATE auth_sessions SET last_seen_at = now()
      WHERE token_hash = $1 AND last_seen_at < now() - interval '1 minute'`,
      [hash],
    );
    return {
      user: publicUser(accountFromRow(row)),
      tokenHash: hash,
      csrfToken: String(row.csrf_token),
    };
  }

  async revoke(token: string | undefined, connection: Connection = this.database): Promise<void> {
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      await connection.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash(token)]);
    }
  }

  async revokeAll(userId: string, connection: Connection = this.database): Promise<void> {
    await connection.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
  }

  verifyCsrf(context: SessionContext, supplied: string | undefined): void {
    if (
      !supplied ||
      !/^[A-Za-z0-9_-]{43}$/.test(supplied) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(context.csrfToken))
    ) {
      throw new ApiError(403, 'INVALID_CSRF', 'Actualizá la sesión y volvé a intentar.');
    }
  }
}
