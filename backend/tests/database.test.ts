/** Pruebas de migraciones y relaciones de datos entre espacios. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { loadMigrations, migrate, checkDatabase } from '../src/database/migrations.js';
import type { Connection, Migration } from '../src/database/migrations.js';

let connection: Connection;
let close: () => Promise<void>;
let migrations: Migration[];

before(async () => {
  migrations = await loadMigrations();
  if (process.env.TEST_DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const client = await pool.connect();
    connection = client;
    close = async () => {
      client.release();
      await pool.end();
    };
  } else {
    // Motor PostgreSQL en WASM sólo para pruebas locales sin Docker.
    // CI usa PostgreSQL de servidor mediante TEST_DATABASE_URL.
    const db = new PGlite();
    connection = {
      query: async (sql, params) => {
        if (params) return db.query<Record<string, unknown>>(sql, params);
        const results = await db.exec(sql);
        return { rows: (results.at(-1)?.rows ?? []) as Record<string, unknown>[] };
      },
    };
    close = () => db.close();
  }
});
after(async () => {
  await close?.();
});

async function isolated(run: () => Promise<void>): Promise<void> {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await connection.query(`CREATE SCHEMA ${schema}`);
  await connection.query(`SET search_path TO ${schema}`);
  try {
    await run();
  } finally {
    await connection.query('SET search_path TO public');
    await connection.query(`DROP SCHEMA ${schema} CASCADE`);
  }
}

test('migraciones: aplica una vez, comprueba versión y rechaza cambios posteriores', () =>
  isolated(async () => {
    await assert.rejects(checkDatabase(connection, migrations));
    assert.deepEqual(
      await migrate(connection, migrations),
      migrations.map((m) => m.name),
    );
    assert.deepEqual(await migrate(connection, migrations), []);
    await checkDatabase(connection, migrations);
    const altered = migrations.map((m) => ({ ...m, checksum: 'altered' }));
    await assert.rejects(migrate(connection, altered), /no coincide/);
    await assert.rejects(checkDatabase(connection, altered), /requiere/);
  }));

test('migraciones: un fallo revierte toda la migración sin registrar el archivo', () =>
  isolated(async () => {
    const broken = {
      name: '999_broken.sql',
      sql: 'CREATE TABLE should_rollback (id integer); SELECT missing_column;',
      checksum: 'test',
    };
    await assert.rejects(migrate(connection, [...migrations, broken]));
    assert.equal(
      (await connection.query("SELECT to_regclass('should_rollback') AS name")).rows[0]?.name,
      null,
    );
    assert.equal(
      (await connection.query('SELECT name FROM schema_migrations')).rows.length,
      migrations.length,
    );
    await checkDatabase(connection, migrations);
  }));

test('el esquema impide mezclar datos entre espacios y valida la forma JSON', () =>
  isolated(async () => {
    await migrate(connection, migrations);
    const user = (
      await connection.query(
        'INSERT INTO users(email, display_name) VALUES ($1, $2) RETURNING id',
        ['owner@example.test', 'Owner'],
      )
    ).rows[0]?.id;
    const workspace = (
      await connection.query(
        'INSERT INTO workspaces(owner_id, name) VALUES ($1, $2) RETURNING id',
        [user, 'Uno'],
      )
    ).rows[0]?.id;
    const other = (
      await connection.query(
        'INSERT INTO workspaces(owner_id, name) VALUES ($1, $2) RETURNING id',
        [user, 'Dos'],
      )
    ).rows[0]?.id;
    const application = (
      await connection.query(
        'INSERT INTO applications(workspace_id, name) VALUES ($1, $2) RETURNING id',
        [workspace, 'Inventario'],
      )
    ).rows[0]?.id;
    const collection = (
      await connection.query(
        'INSERT INTO app_collections(workspace_id, application_id, key, name) VALUES ($1, $2, $3, $4) RETURNING id',
        [workspace, application, 'items', 'Items'],
      )
    ).rows[0]?.id;
    await connection.query(
      'INSERT INTO app_records(workspace_id, application_id, collection_id, data) VALUES ($1, $2, $3, $4)',
      [workspace, application, collection, { name: 'Pieza', stock: 5 }],
    );
    await assert.rejects(
      connection.query(
        'INSERT INTO app_records(workspace_id, application_id, collection_id) VALUES ($1, $2, $3)',
        [other, application, collection],
      ),
      (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error && error.code === '23503',
    );
    await assert.rejects(
      connection.query(
        'INSERT INTO app_records(workspace_id, application_id, collection_id, data) VALUES ($1, $2, $3, $4)',
        [workspace, application, collection, '[]'],
      ),
    );
    await connection.query('DELETE FROM applications WHERE id = $1', [application]);
    assert.equal((await connection.query('SELECT id FROM app_records')).rows.length, 0);
  }));
