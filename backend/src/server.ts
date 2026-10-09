/** Arranca Ensambla, conecta los módulos con PostgreSQL y atiende el cierre
 * del proceso sin cortar de golpe las solicitudes que están en curso. */
import { readConfig } from './config.js';
import { createDatabase } from './database/database.js';
import { createPool } from './database/pool.js';
import { checkDatabase, loadMigrations } from './database/migrations.js';
import { createApp } from './http/app.js';

async function main(): Promise<void> {
  const config = readConfig();
  const migrations = await loadMigrations();
  const pool = createPool(config.databaseUrl);
  let stopping = false;
  const app = createApp({
    config,
    database: createDatabase(pool),
    checkReadiness: async () => {
      if (stopping) throw new Error('El servidor se está cerrando.');
      await checkDatabase(pool, migrations);
    },
  });
  const server = app.listen(config.port, config.host, () => {
    console.log(
      JSON.stringify({
        event: 'server_started',
        port: config.port,
        environment: config.environment,
      }),
    );
  });
  server.on('error', async () => {
    console.error('No se pudo iniciar el servidor HTTP.');
    await pool.end();
    process.exitCode = 1;
  });
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    console.log(JSON.stringify({ event: 'server_stopping' }));
    const deadline = setTimeout(() => process.exit(1), 10_000);
    deadline.unref();
    server.close(() => {
      void pool
        .end()
        .then(() => clearTimeout(deadline))
        .catch(() => {
          process.exitCode = 1;
        });
    });
    server.closeIdleConnections();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch(() => {
  console.error(
    'No se pudo iniciar Ensambla. Revisá la configuración y la documentación de desarrollo.',
  );
  process.exitCode = 1;
});
