/** Consultas de cuentas. Encapsula SQL parametrizado y transforma las filas
 * de PostgreSQL al modelo usado por los servicios de autenticación. */
import type { Database } from '../../database/database.js';
import type { Connection } from '../../database/migrations.js';
import type { Account, PublicUser } from './types.js';

export function accountFromRow(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    createdAt: (row.created_at instanceof Date
      ? row.created_at
      : new Date(String(row.created_at))
    ).toISOString(),
    passwordHash: row.password_hash === null ? null : String(row.password_hash),
    disabled: row.disabled_at !== null,
  };
}

export class AccountRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<Account | null> {
    const result = await this.database.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const result = await this.database.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }

  async create(
    connection: Connection,
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<Account> {
    const result = await connection.query(
      'INSERT INTO users(email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [email, displayName, passwordHash],
    );
    return accountFromRow(result.rows[0]!);
  }

  async updateProfile(id: string, displayName: string): Promise<PublicUser> {
    const result = await this.database.query(
      'UPDATE users SET display_name = $2 WHERE id = $1 RETURNING *',
      [id, displayName],
    );
    return accountFromRow(result.rows[0]!);
  }
}
