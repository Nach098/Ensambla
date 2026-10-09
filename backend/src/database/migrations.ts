import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export interface Migration { name: string; sql: string; checksum: string }
export interface Connection {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export async function loadMigrations(
  directory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url)),
): Promise<Migration[]> {
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (names.length === 0) throw new Error('No se encontraron migraciones.');
  if (new Set(names.map(name => name.slice(0, 3))).size !== names.length) {
    throw new Error('Dos migraciones comparten el mismo número.');
  }
  return Promise.all(names.map(async name => {
    const sql = await readFile(join(directory, name), 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

// El llamador debe reservar una única conexión hasta finalizar.
export async function migrate(connection: Connection, migrations: Migration[]): Promise<string[]> {
  const applied: string[] = [];
  await connection.query("SELECT pg_advisory_lock(hashtext('ensambla_migrations'))");
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const previous = await connection.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
    const known = new Map(migrations.map(m => [m.name, m]));
    for (const row of previous.rows) {
      const migration = known.get(String(row.name));
      if (!migration || migration.checksum !== row.checksum) {
        throw new Error(`La migración aplicada ${String(row.name)} no coincide con el repositorio.`);
      }
    }
    const completed = new Set(previous.rows.map(row => String(row.name)));
    for (const migration of migrations) {
      if (completed.has(migration.name)) continue;
      await connection.query('BEGIN');
      try {
        await connection.query(migration.sql);
        await connection.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
          [migration.name, migration.checksum]);
        await connection.query('COMMIT');
        applied.push(migration.name);
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      }
    }
    return applied;
  } finally {
    await connection.query("SELECT pg_advisory_unlock(hashtext('ensambla_migrations'))");
  }
}

export async function checkDatabase(connection: Connection, migrations: Migration[]): Promise<void> {
  const result = await connection.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
  if (result.rows.length !== migrations.length || migrations.some(migration =>
    !result.rows.some(row => row.name === migration.name && row.checksum === migration.checksum))) {
    throw new Error('La base de datos requiere las migraciones de esta versión.');
  }
}
