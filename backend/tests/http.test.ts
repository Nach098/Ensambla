/** Pruebas de servicio HTTP, cabeceras y errores. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/http/app.js';
import { readConfig } from '../src/config.js';

test('HTTP sirve la maqueta y distingue liveness, readiness y recursos inexistentes', async (t) => {
  let databaseAvailable = true;
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    config: readConfig({ DATABASE_URL: 'postgres://localhost/ensambla', NODE_ENV: 'test' }),
    checkReadiness: async () => {
      if (!databaseAvailable) throw new Error('password privada');
    },
    log: (event) => logs.push(event),
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Ensambla/);
  assert.equal(home.headers.get('x-powered-by'), null);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.match(home.headers.get('content-security-policy') ?? '', /script-src 'self'/);
  assert.doesNotMatch(
    home.headers.get('content-security-policy') ?? '',
    /upgrade-insecure-requests/,
  );
  assert.equal(
    (await fetch(`${base}/assets/landing-comercio-v1.webp`)).headers.get('content-type'),
    'image/webp',
  );
  assert.match((await fetch(`${base}/app.js`)).headers.get('content-type') ?? '', /javascript/);
  assert.equal((await fetch(`${base}/sw.js`)).headers.get('cache-control'), 'no-cache');
  const ready = await fetch(`${base}/api/health/ready`);
  assert.equal(ready.status, 200);
  assert.equal(ready.headers.get('cache-control'), 'no-store');
  databaseAvailable = false;
  const unavailable = await fetch(`${base}/api/health/ready`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: 'unavailable' });
  assert.equal((await fetch(`${base}/api/health/live`)).status, 200);
  const missing = await fetch(`${base}/api/accounts?token=private-token`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type') ?? '', /application\/json/);
  assert.equal((await fetch(`${base}/missing-page`)).status, 404);
  const invalid = await fetch(`${base}/api/future`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{broken',
  });
  assert.equal(invalid.status, 400);
  const large = await fetch(`${base}/api/future`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify('x'.repeat(300_000)),
  });
  assert.equal(large.status, 413);
  assert.doesNotMatch(JSON.stringify(logs), /private-token|password privada|broken/);
});
