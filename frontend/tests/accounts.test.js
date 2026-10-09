/** Pruebas del cliente y vistas de cuenta. Verifica permisos de presentación,
 * errores de conexión, formularios y separación de borradores sin guardar tokens. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../public/api.js';
import { createAccountClient } from '../public/account-client.js';
import { accountPage, administration } from '../public/account-views.js';
import { loadState, persist } from '../public/store.js';

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const user = {
  id: 'user-a',
  email: 'persona@example.test',
  displayName: 'Persona',
  createdAt: '2026-10-09T00:00:00.000Z',
};
const space = { id: 'space-a', name: 'Mi espacio', role: 'owner', createdAt: user.createdAt };

test('API usa cookies del mismo origen y CSRF en memoria sólo para escrituras', async () => {
  const calls = [];
  const api = createApiClient({
    fetchFn: async (path, options) => {
      calls.push({ path, options });
      return options.method === 'DELETE' ? new Response(null, { status: 204 }) : json({ ok: true });
    },
  });
  api.setCsrf('token-en-memoria');
  await api.request('/api/auth/session');
  await api.request('/api/workspaces/one', { method: 'PATCH', body: { name: 'Nuevo' } });
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers['X-CSRF-Token'], undefined);
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'token-en-memoria');
  assert.equal(calls[1].options.headers['X-Ensambla-Request'], '1');
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: 'Nuevo' });
  assert.equal(await api.request('/api/workspaces/one/members/person', { method: 'DELETE' }), null);
  await assert.rejects(api.request('https://otro.example/api'), /mismo origen/);
});

test('errores de contraseña no cierran la sesión; una sesión revocada sí avisa al cliente', async () => {
  let expired = 0,
    code = 'INVALID_CREDENTIALS';
  const api = createApiClient({
    fetchFn: async () => json({ error: { code, message: 'Error controlado' } }, 401),
    onSessionExpired: () => expired++,
  });
  await assert.rejects(
    api.request('/api/auth/login', { method: 'POST', body: {} }),
    /Error controlado/,
  );
  assert.equal(expired, 0);
  code = 'SESSION_REQUIRED';
  await assert.rejects(api.request('/api/workspaces'), /Error controlado/);
  assert.equal(expired, 1);
});

test('cliente toma roles del servidor y pierde permisos al quedar sin conexión', async () => {
  let role = 'owner',
    offline = false,
    changes = 0;
  const client = createAccountClient({
    fetchFn: async (path) => {
      if (offline) throw new Error('offline');
      return path === '/api/auth/session'
        ? json({ user, csrfToken: 'csrf' })
        : json({ workspaces: [{ ...space, role }] });
    },
    onChange: () => changes++,
  });
  await client.refresh();
  assert.equal(client.canManage(), true);
  assert.equal(client.canEdit(), true);
  const previous = changes;
  await client.refresh();
  assert.equal(changes, previous);
  role = 'viewer';
  await client.refresh();
  assert.equal(client.canManage(), false);
  assert.equal(client.canEdit(), false);
  offline = true;
  await client.refresh();
  assert.equal(client.state.status, 'unavailable');
  assert.equal(client.canEdit(), false);
});

test('una respuesta vieja de sesión no revive una cuenta que ya cerró sesión', async () => {
  let finish;
  const client = createAccountClient({
    fetchFn: async (path) => {
      if (path === '/api/auth/session')
        return new Promise((resolve) => {
          finish = resolve;
        });
      return new Response(null, { status: 204 });
    },
  });
  const pending = client.refresh();
  await client.logout();
  finish(json({ user, csrfToken: 'old' }));
  await pending;
  assert.equal(client.state.status, 'guest');
  assert.equal(client.state.user, null);
});

test('registro y acceso ofrecen etiquetas, autocompletado y avisos accesibles', () => {
  const registration = accountPage('register'),
    login = accountPage('login');
  assert.match(registration, /data-account-form="register"/);
  assert.match(registration, /autocomplete="new-password"/);
  assert.match(registration, /minlength="15"/);
  assert.match(registration, /role="alert"/);
  assert.match(login, /autocomplete="current-password"/);
  assert.match(login, /data-account-action="show-password"/);
});

test('una carga vieja de espacios no revive una sesión cerrada durante el ingreso', async () => {
  let finishSpaces;
  const client = createAccountClient({
    fetchFn: async (path) => {
      if (path === '/api/auth/login') return json({ user, csrfToken: 'csrf' });
      if (path === '/api/workspaces')
        return new Promise((resolve) => {
          finishSpaces = resolve;
        });
      return new Response(null, { status: 204 });
    },
  });
  const pending = client.login({ email: user.email, password: 'Una frase larga de prueba' });
  while (!finishSpaces) await new Promise((resolve) => setImmediate(resolve));
  await client.logout();
  finishSpaces(json({ workspaces: [space] }));
  await pending;
  assert.equal(client.state.status, 'guest');
  assert.equal(client.state.user, null);
  assert.equal(client.canManage(), false);
});

test('un registro exitoso con conexión interrumpida recupera la sesión sin registrar otra cuenta', async () => {
  let offline = true;
  let registrations = 0;
  const client = createAccountClient({
    fetchFn: async (path) => {
      if (path === '/api/auth/register') {
        registrations++;
        return json({ user, csrfToken: 'csrf' });
      }
      if (path === '/api/auth/session') return json({ user, csrfToken: 'csrf' });
      if (offline) throw new Error('sin conexión');
      return json({ workspaces: [space] });
    },
  });
  await assert.rejects(client.register({}), /conectar/);
  assert.equal(client.state.status, 'unavailable');
  assert.equal(client.state.user.id, user.id);
  assert.equal(client.canEdit(), false);
  offline = false;
  await client.refresh();
  assert.equal(client.canManage(), true);
  assert.equal(registrations, 1);
});

test('administración oculta controles ajenos al rol y escapa identidad y nombres', () => {
  const account = {
    user: { ...user, displayName: '<img src=x onerror=alert(1)>' },
    workspaces: [space],
    activeWorkspaceId: space.id,
    members: [],
    membersStatus: 'ready',
  };
  const owner = administration(account);
  assert.match(owner, /data-account-form="member"/);
  assert.doesNotMatch(owner, /<img src=x/);
  const editor = administration({ ...account, workspaces: [{ ...space, role: 'editor' }] });
  assert.doesNotMatch(editor, /data-account-form="member"/);
  assert.match(editor, /data-account-form="workspace"/);
  const viewer = administration({ ...account, workspaces: [{ ...space, role: 'viewer' }] });
  assert.doesNotMatch(viewer, /data-account-form="member"|data-account-form="workspace"/);
  assert.doesNotMatch(owner, /owner-view|role-select|data-member-role/);
});

test('borradores de distintas cuentas/espacios no se mezclan y la maqueta anterior se conserva', (t) => {
  const previous = globalThis.localStorage,
    storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  });
  const original = loadState();
  original.apps[0].name = 'Maqueta anterior';
  persist(original);
  const first = loadState('user-a:space-a');
  first.apps[0].name = 'Borrador A';
  persist(first, 'user-a:space-a');
  const second = loadState('user-b:space-a');
  assert.notEqual(second.apps[0].name, 'Borrador A');
  assert.notEqual(loadState('user-a:space-b').apps[0].name, 'Borrador A');
  assert.equal(loadState('user-a:space-a').apps[0].name, 'Borrador A');
  assert.equal(loadState().apps[0].name, 'Maqueta anterior');
  assert.doesNotMatch([...storage.values()].join(''), /csrfToken|ensambla_session|passwordHash/);
});
