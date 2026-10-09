/** Mantenimiento manual de autenticación. Elimina sesiones vencidas o inactivas
 * y contadores caducados; no modifica cuentas, espacios ni datos de aplicaciones. */
import { readConfig } from '../config.js';
import { createPool } from './pool.js';

async function main(): Promise<void> {
  const pool = createPool(readConfig().databaseUrl);
  try {
    const sessions = await pool.query(`DELETE FROM auth_sessions
      WHERE expires_at <= now() OR last_seen_at <= now() - interval '12 hours'`);
    const limits = await pool.query('DELETE FROM auth_rate_limits WHERE reset_at <= now()');
    console.log(
      JSON.stringify({
        event: 'auth_cleanup',
        sessions: sessions.rowCount,
        counters: limits.rowCount,
      }),
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error('No se pudo completar el mantenimiento de autenticación.');
  process.exitCode = 1;
});
