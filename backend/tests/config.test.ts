/** Pruebas de validación de configuración del servidor. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';

const valid = { DATABASE_URL: 'postgresql://local:password@localhost:5432/ensambla' };
test('valida variables sin revelar credenciales en los errores', () => {
  assert.throws(() => readConfig({}), /Falta DATABASE_URL/);
  assert.throws(() => readConfig({ ...valid, PORT: '3.2' }), /PORT/);
  assert.throws(() => readConfig({ ...valid, PORT: '65536' }), /PORT/);
  assert.throws(() => readConfig({ ...valid, NODE_ENV: 'prod' }), /NODE_ENV/);
  assert.throws(() => readConfig({ ...valid, TRUST_PROXY: 'yes' }), /TRUST_PROXY/);
  for (const databaseUrl of [
    'broken-password',
    'https://secret-password@example.com/database',
    'postgres://localhost/',
  ]) {
    assert.throws(
      () => readConfig({ DATABASE_URL: databaseUrl }),
      (error: unknown) => error instanceof Error && !error.message.includes('password'),
    );
  }
});
test('resuelve rutas del proyecto y mantiene el proxy desactivado por defecto', () => {
  const config = readConfig(valid);
  assert.equal(config.port, 3000);
  assert.equal(config.trustProxy, false);
  assert.ok(config.frontendPath.endsWith('/frontend/public/'));
  assert.equal(
    readConfig({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://ensambla.test',
      TRUST_PROXY: 'true',
    }).trustProxy,
    true,
  );
});
