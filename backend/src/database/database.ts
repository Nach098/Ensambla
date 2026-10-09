/** Acceso a PostgreSQL y transacciones. Reserva una conexión para que todos
 * los pasos de una operación se confirmen o se reviertan juntos. */
import type pg from 'pg';
import type { Connection } from './migrations.js';

export interface Database extends Connection {
  transaction<T>(work: (connection: Connection) => Promise<T>): Promise<T>;
}

export function createDatabase(pool: pg.Pool): Database {
  return {
    query: (sql, parameters) => pool.query(sql, parameters),
    async transaction<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
