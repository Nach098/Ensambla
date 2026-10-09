/** Casos de uso de cuenta: registrar, acceder, editar perfil y cambiar clave.
 * Coordina hashes, sesiones y transacciones sin depender de Express. */
import type { Database } from '../../database/database.js';
import { ApiError } from '../../http/errors.js';
import { AccountRepository } from './repository.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { SessionService } from './sessions.js';
import type { LoginInput, PublicUser, RegisterInput, SessionIssue } from './types.js';

export class AuthService {
  readonly accounts: AccountRepository;
  readonly sessions: SessionService;
  constructor(private readonly database: Database) {
    this.accounts = new AccountRepository(database);
    this.sessions = new SessionService(database);
  }

  async register(input: RegisterInput, previousToken?: string): Promise<SessionIssue> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.database.transaction(async (connection) => {
        const user = await this.accounts.create(
          connection,
          input.email,
          input.displayName,
          passwordHash,
        );
        await connection.query('INSERT INTO workspaces(owner_id, name) VALUES ($1, $2)', [
          user.id,
          input.workspaceName,
        ]);
        await this.sessions.revoke(previousToken, connection);
        return this.sessions.issue(connection, user);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ApiError(
          409,
          'ACCOUNT_EXISTS',
          'No se pudo registrar ese correo. Si ya tenés cuenta, iniciá sesión.',
        );
      }
      throw error;
    }
  }

  async login(input: LoginInput, previousToken?: string): Promise<SessionIssue> {
    const user = await this.accounts.findByEmail(input.email);
    const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
    if (!valid || !user || user.disabled)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.');
    return this.database.transaction(async (connection) => {
      // Revisa nuevamente dentro de la transacción: una clave pudo cambiar durante el hash.
      const current = await connection.query(
        'SELECT id FROM users WHERE id = $1 AND password_hash = $2 AND disabled_at IS NULL FOR UPDATE',
        [user.id, user.passwordHash],
      );
      if (!current.rows[0])
        throw new ApiError(
          401,
          'INVALID_CREDENTIALS',
          'El correo o la contraseña no son correctos.',
        );
      await this.sessions.revoke(previousToken, connection);
      return this.sessions.issue(connection, user);
    });
  }

  async updateProfile(userId: string, displayName: string): Promise<PublicUser> {
    return this.accounts.updateProfile(userId, displayName);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.accounts.findById(userId);
    const valid = await verifyPassword(currentPassword, user?.passwordHash ?? null);
    if (!valid || !user || user.disabled)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'La contraseña actual no es correcta.');
    const newHash = await hashPassword(newPassword);
    await this.database.transaction(async (connection) => {
      const updated = await connection.query(
        'UPDATE users SET password_hash = $3 WHERE id = $1 AND password_hash = $2 AND disabled_at IS NULL RETURNING id',
        [userId, user.passwordHash, newHash],
      );
      if (!updated.rows[0])
        throw new ApiError(409, 'ACCOUNT_CHANGED', 'La cuenta cambió. Iniciá sesión nuevamente.');
      await this.sessions.revokeAll(userId, connection);
    });
  }
}
