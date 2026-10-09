/** Comando de migración de base. Reserva una conexión, ejecuta los archivos pendientes y termina con un estado verificable. */
import { readConfig } from '../config.js';
import { createPool } from './pool.js';
import { loadMigrations, migrate } from './migrations.js';

async function main(): Promise<void> {
  const config = readConfig();
  const pool = createPool(config.databaseUrl);
  try {
    const migrations = await loadMigrations();
    const client = await pool.connect();
    try {
      const applied = await migrate(client, migrations);
      console.log(JSON.stringify({ event: 'migrations_complete', applied }));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error(
    'No se pudieron aplicar las migraciones. Revisá la conexión y el esquema en un entorno privado.',
  );
  process.exitCode = 1;
});
