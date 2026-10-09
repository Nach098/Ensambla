/** Base aislada para pruebas de cuentas. Usa PostgreSQL en CI y PGlite
 * localmente; elimina sólo su esquema temporal al terminar. */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { createDatabase } from '../../src/database/database.js';
import type { Database } from '../../src/database/database.js';
import type { Connection } from '../../src/database/migrations.js';
import { loadMigrations, migrate } from '../../src/database/migrations.js';

interface PGliteQueries {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<Array<{ rows: unknown[] }>>;
}
function adapt(db: PGliteQueries): Connection {
  return {
    query: async (sql, params) => {
      if (params) return db.query<Record<string, unknown>>(sql, params);
      const results = await db.exec(sql);
      return { rows: (results.at(-1)?.rows ?? []) as Record<string, unknown>[] };
    },
  };
}

export async function testDatabase(): Promise<{ database: Database; close: () => Promise<void> }> {
  const migrations = await loadMigrations();
  if (process.env.TEST_DATABASE_URL) {
    const url = process.env.TEST_DATABASE_URL;
    const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
    const manager = new pg.Pool({ connectionString: url });
    await manager.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
    const client = await pool.connect();
    try {
      await migrate(client, migrations);
    } finally {
      client.release();
    }
    return {
      database: createDatabase(pool),
      close: async () => {
        await pool.end();
        await manager.query(`DROP SCHEMA ${schema} CASCADE`);
        await manager.end();
      },
    };
  }
  const db = new PGlite();
  const connection = adapt(db);
  await migrate(connection, migrations);
  return {
    database: { ...connection, transaction: (work) => db.transaction((tx) => work(adapt(tx))) },
    close: () => db.close(),
  };
}
