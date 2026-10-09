/** Pruebas de exclusión de datos privados de la caché. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('el service worker deja cuentas/licencias/API y peticiones autenticadas fuera de caché', async () => {
  const handlers = {};
  let fetchCalls = 0;
  let cacheWrites = 0;
  const script = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  runInNewContext(script, {
    URL,
    Response,
    self: {
      location: { origin: 'https://ensambla.test' },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
    },
    fetch: async (request) => {
      fetchCalls++;
      return new Response('ok', {
        headers: { 'Cache-Control': request.url.includes('private') ? 'no-store' : 'no-cache' },
      });
    },
    caches: {
      open: async () => ({
        put: () => {
          cacheWrites++;
        },
      }),
    },
  });
  for (const path of ['/api', '/api/accounts', '/api/licensing/status']) {
    let intercepted = false;
    handlers.fetch({
      request: new Request(`https://ensambla.test${path}`),
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  handlers.fetch({
    request: new Request('https://ensambla.test/protected', {
      headers: { Authorization: 'Bearer secret' },
    }),
    respondWith: () => assert.fail('No debe interceptar'),
  });
  assert.equal(fetchCalls, 0);
  for (const path of ['/app.js', '/private-resource']) {
    let response;
    handlers.fetch({
      request: new Request(`https://ensambla.test${path}`),
      respondWith: (promise) => {
        response = promise;
      },
    });
    assert.equal((await response).status, 200);
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(cacheWrites, 1);
});
