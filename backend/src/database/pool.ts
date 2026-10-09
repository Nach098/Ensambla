/** Pool de conexiones PostgreSQL. Define límites y tiempos de espera sin exponer credenciales en los logs. */
import pg from 'pg';

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
    query_timeout: 5_000,
    keepAlive: true,
    application_name: 'ensambla',
  });
  pool.on('error', () => {
    // No imprimir URL, credenciales ni consultas en los logs.
    console.error(JSON.stringify({ level: 'error', event: 'database_pool_error' }));
  });
  return pool;
}
