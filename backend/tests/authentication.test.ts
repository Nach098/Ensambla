/** Prueba el recorrido HTTP real de cuentas y permisos con una base aislada.
 * Cubre cookies, CSRF, caducidad, concurrencia y separación entre propietarios. */
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readConfig } from '../src/config.js';
import { createApp } from '../src/http/app.js';
import { checkDatabase, loadMigrations } from '../src/database/migrations.js';
import type { Database } from '../src/database/database.js';
import { AuthService } from '../src/modules/auth/service.js';
import { tokenHash } from '../src/modules/auth/sessions.js';
import { testDatabase } from './helpers/database.js';

const PASSWORD = 'Una frase larga para Ensambla 2026';
let database: Database;
let closeDatabase: () => Promise<void>;
let server: Server;
let base: string;
let auth: AuthService;
const logs: Record<string, unknown>[] = [];
interface Client {
  cookie: string;
  csrf: string;
  userId: string;
  email: string;
}

before(async () => {
  ({ database, close: closeDatabase } = await testDatabase());
  auth = new AuthService(database);
  const migrations = await loadMigrations();
  server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
  const config = {
    ...readConfig({ DATABASE_URL: 'postgres://localhost/ensambla', NODE_ENV: 'test' }),
    appOrigin: base,
  };
  server.on(
    'request',
    createApp({
      config,
      database,
      checkReadiness: () => checkDatabase(database, migrations),
      log: (event) => logs.push(event),
    }),
  );
});
after(async () => {
  if (server)
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  await closeDatabase?.();
});

async function request(
  path: string,
  method = 'GET',
  body?: unknown,
  client?: Client,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(method !== 'GET'
        ? { 'content-type': 'application/json', 'x-ensambla-request': '1', origin: base }
        : {}),
      ...(client ? { cookie: client.cookie, 'x-csrf-token': client.csrf } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function responseClient(response: Response, email: string): Promise<Client> {
  const data = (await response.json()) as { user: { id: string }; csrfToken: string };
  const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  return { cookie, csrf: data.csrfToken, userId: data.user.id, email };
}
let sequence = 0;
async function account(label = 'Persona'): Promise<Client> {
  const email = `person${++sequence}@ensambla.test`;
  const issued = await auth.register({
    email,
    displayName: label,
    password: PASSWORD,
    workspaceName: `Espacio ${label}`,
  });
  return {
    cookie: `ensambla_session=${issued.token}`,
    csrf: issued.context.csrfToken,
    userId: issued.context.user.id,
    email,
  };
}
async function workspace(client: Client): Promise<string> {
  const response = await request('/api/workspaces', 'GET', undefined, client);
  assert.equal(response.status, 200);
  const data = (await response.json()) as { workspaces: Array<{ id: string }> };
  return data.workspaces[0]!.id;
}
async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

test('registro crea una cuenta, un espacio propio y una sesión persistente sin exponer secretos', async () => {
  const response = await request('/api/auth/register', 'POST', {
    email: ' NUEVA@ENSAMBLA.TEST ',
    displayName: 'Nueva persona',
    password: PASSWORD,
    workspaceName: 'Mi equipo',
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/);
  assert.match(response.headers.get('set-cookie') ?? '', /SameSite=Lax/);
  const client = await responseClient(response, 'nueva@ensambla.test');
  const row = (
    await database.query('SELECT password_hash FROM users WHERE id = $1', [client.userId])
  ).rows[0]!;
  assert.match(String(row.password_hash), /^scrypt\$/);
  assert.doesNotMatch(String(row.password_hash), new RegExp(PASSWORD));
  const sessionRow = (
    await database.query('SELECT token_hash FROM auth_sessions WHERE user_id = $1', [client.userId])
  ).rows[0]!;
  assert.equal(sessionRow.token_hash, tokenHash(client.cookie.split('=')[1]!));
  assert.notEqual(sessionRow.token_hash, client.cookie.split('=')[1]);
  const session = await request('/api/auth/session', 'GET', undefined, client);
  const data = (await session.json()) as Record<string, unknown>;
  assert.doesNotMatch(JSON.stringify(data), /passwordHash|tokenHash|scrypt\$/);
  assert.equal((data.user as { email: string }).email, 'nueva@ensambla.test');
  const id = await workspace(client);
  assert.equal(
    (await database.query('SELECT owner_id FROM workspaces WHERE id = $1', [id])).rows[0]?.owner_id,
    client.userId,
  );
  const duplicate = await request('/api/auth/register', 'POST', {
    email: 'nueva@ensambla.test',
    displayName: 'Otra persona',
    password: PASSWORD,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(await errorCode(duplicate), 'ACCOUNT_EXISTS');
  assert.equal(
    (await database.query('SELECT id FROM users WHERE email = $1', ['nueva@ensambla.test'])).rows
      .length,
    1,
  );
});

test('valida entradas y no acepta roles o propietarios en el registro', async () => {
  for (const payload of [
    { email: 'x@example.test', displayName: 'Persona', password: 'corta' },
    { email: 'incorrecto', displayName: 'Persona', password: PASSWORD },
    { email: 'x@example.test', displayName: 'Persona', password: PASSWORD, role: 'owner' },
  ])
    assert.equal((await request('/api/auth/register', 'POST', payload)).status, 400);
  assert.equal((await request('/api/workspaces')).status, 401);
});

test('producción emite y borra una cookie Secure con prefijo __Host y sin dominio', async (t) => {
  const productionOrigin = 'https://ensambla.example';
  const production = createServer(
    createApp({
      config: readConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://localhost/ensambla',
        APP_ORIGIN: productionOrigin,
      }),
      database,
      checkReadiness: async () => {},
      log: () => {},
    }),
  );
  production.listen(0, '127.0.0.1');
  await once(production, 'listening');
  t.after(async () => {
    await new Promise<void>((resolve) => {
      production.close(() => resolve());
      production.closeAllConnections();
    });
  });
  const address = production.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const headers = {
    'content-type': 'application/json',
    'x-ensambla-request': '1',
    origin: productionOrigin,
  };
  const response = await fetch(`${url}/api/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: 'produccion@ensambla.test',
      displayName: 'Cuenta de prueba',
      password: PASSWORD,
    }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /^__Host-ensambla_session=/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Path=\//);
  assert.doesNotMatch(cookie, /Domain=/i);
  const data = (await response.json()) as { csrfToken: string };
  const logout = await fetch(`${url}/api/auth/logout`, {
    method: 'POST',
    headers: { ...headers, cookie: cookie.split(';')[0]!, 'x-csrf-token': data.csrfToken },
    body: '{}',
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie')!, /^__Host-ensambla_session=;.*Secure/);
});

test('inicio de sesión rechaza credenciales con el mismo error y rota la sesión anterior', async () => {
  const client = await account('Acceso');
  const bad = await request('/api/auth/login', 'POST', {
    email: client.email,
    password: 'Otra clave larga incorrecta',
  });
  const unknown = await request('/api/auth/login', 'POST', {
    email: 'noexiste@ensambla.test',
    password: 'Otra clave larga incorrecta',
  });
  assert.equal(bad.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(await errorCode(bad), await errorCode(unknown));
  const logged = await request(
    '/api/auth/login',
    'POST',
    { email: client.email, password: PASSWORD },
    client,
  );
  assert.equal(logged.status, 200);
  const next = await responseClient(logged, client.email);
  assert.notEqual(next.cookie, client.cookie);
  assert.notEqual(next.csrf, client.csrf);
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 401);
  assert.equal((await request('/api/workspaces', 'GET', undefined, next)).status, 200);
});

test('origen, cabecera propia, JSON y CSRF son obligatorios para modificar datos', async () => {
  const client = await account('CSRF');
  const id = await workspace(client);
  const payload = { email: client.email, password: PASSWORD };
  for (const origin of ['https://attacker.test', 'null', '']) {
    assert.equal(
      (await request('/api/auth/login', 'POST', payload, undefined, { origin })).status,
      403,
    );
  }
  assert.equal(
    (await request('/api/auth/login', 'POST', payload, undefined, { 'x-ensambla-request': '' }))
      .status,
    403,
  );
  assert.equal(
    (await request('/api/auth/login', 'POST', payload, undefined, { 'content-type': 'text/plain' }))
      .status,
    415,
  );
  for (const token of ['', 'invalid', 'ñ'.repeat(43)]) {
    const response = await request(`/api/workspaces/${id}`, 'PATCH', { name: 'Cambiado' }, client, {
      'x-csrf-token': token,
    });
    assert.equal(response.status, 403);
    assert.equal(await errorCode(response), 'INVALID_CSRF');
  }
  assert.equal(
    (await database.query('SELECT name FROM workspaces WHERE id = $1', [id])).rows[0]?.name,
    'Espacio CSRF',
  );
});

test('cierre de sesión invalida la cookie aunque el cliente conserve su valor', async () => {
  const client = await account('Salida');
  assert.equal((await request('/api/auth/logout', 'POST', {}, client)).status, 204);
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 401);
  const response = await request('/api/auth/session', 'GET', undefined, client);
  assert.deepEqual(await response.json(), { user: null, csrfToken: null });
});

test('cerrar todas las sesiones revoca el acceso desde otros dispositivos', async () => {
  const client = await account('Dispositivos');
  const another = await responseClient(
    await request('/api/auth/login', 'POST', { email: client.email, password: PASSWORD }),
    client.email,
  );
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 200);
  assert.equal((await request('/api/auth/logout-all', 'POST', {}, another)).status, 204);
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 401);
  assert.equal((await request('/api/workspaces', 'GET', undefined, another)).status, 401);
});

test('sesiones vencidas, inactivas o de cuentas deshabilitadas no autorizan solicitudes', async () => {
  for (const kind of ['expired', 'idle', 'disabled']) {
    const client = await account(kind);
    if (kind === 'expired')
      await database.query(
        "UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1",
        [client.userId],
      );
    if (kind === 'idle')
      await database.query(
        "UPDATE auth_sessions SET last_seen_at = now() - interval '13 hours' WHERE user_id = $1",
        [client.userId],
      );
    if (kind === 'disabled')
      await database.query('UPDATE users SET disabled_at = now() WHERE id = $1', [client.userId]);
    assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 401);
  }
});

test('editar perfil mantiene la identidad; cambiar contraseña exige la actual y revoca todas las sesiones', async () => {
  const client = await account('Perfil');
  const profile = await request(
    '/api/auth/profile',
    'PATCH',
    { displayName: 'Nombre actualizado' },
    client,
  );
  assert.equal(profile.status, 200);
  assert.equal(
    ((await profile.json()) as { user: { displayName: string } }).user.displayName,
    'Nombre actualizado',
  );
  assert.equal(
    (
      await request(
        '/api/auth/profile',
        'PATCH',
        { displayName: 'Otro', email: 'changed@ensambla.test' },
        client,
      )
    ).status,
    400,
  );
  const newPassword = 'Una segunda frase muy distinta 2026';
  assert.equal(
    (
      await request(
        '/api/auth/password',
        'POST',
        { currentPassword: 'Una clave equivocada', newPassword },
        client,
      )
    ).status,
    401,
  );
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 200);
  assert.equal(
    (
      await request(
        '/api/auth/password',
        'POST',
        { currentPassword: PASSWORD, newPassword },
        client,
      )
    ).status,
    204,
  );
  assert.equal((await request('/api/workspaces', 'GET', undefined, client)).status, 401);
  assert.equal(
    (await request('/api/auth/login', 'POST', { email: client.email, password: PASSWORD })).status,
    401,
  );
  assert.equal(
    (await request('/api/auth/login', 'POST', { email: client.email, password: newPassword }))
      .status,
    200,
  );
});

test('permisos reales: dueño administra, editor modifica y lector consulta; otro propietario no accede', async () => {
  const owner = await account('Dueño');
  const editor = await account('Editor');
  const viewer = await account('Lector');
  const outsider = await account('Ajeno');
  const id = await workspace(owner);
  for (const [client, role] of [
    [editor, 'editor'],
    [viewer, 'viewer'],
  ] as const) {
    assert.equal(
      (await request(`/api/workspaces/${id}/members`, 'POST', { email: client.email, role }, owner))
        .status,
      201,
    );
  }
  assert.equal((await request(`/api/workspaces/${id}`, 'GET', undefined, editor)).status, 200);
  assert.equal((await request(`/api/workspaces/${id}`, 'GET', undefined, viewer)).status, 200);
  assert.equal(
    (await request(`/api/workspaces/${id}`, 'PATCH', { name: 'Editado' }, editor)).status,
    200,
  );
  assert.equal(
    (
      await request(`/api/workspaces/${id}`, 'PATCH', { name: 'No permitido' }, viewer, {
        'x-role': 'owner',
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/api/workspaces/${id}/members`, 'GET', undefined, editor)).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/api/workspaces/${id}/members`,
        'POST',
        { email: outsider.email, role: 'editor' },
        editor,
      )
    ).status,
    403,
  );
  assert.equal((await request(`/api/workspaces/${id}`, 'GET', undefined, outsider)).status, 404);
  assert.equal(
    (await request(`/api/workspaces/${id}/members`, 'GET', undefined, outsider)).status,
    404,
  );
  assert.equal((await request('/api/workspaces/not-a-uuid', 'GET', undefined, owner)).status, 404);
  assert.equal(
    (
      await request(
        `/api/workspaces/${id}/members`,
        'POST',
        { email: owner.email, role: 'viewer' },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/api/workspaces/${id}/members/${editor.userId}`,
        'PATCH',
        { role: 'owner' },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/api/workspaces/${id}/members/${editor.userId}`,
        'PATCH',
        { role: 'viewer' },
        owner,
      )
    ).status,
    204,
  );
  assert.equal(
    (await request(`/api/workspaces/${id}`, 'PATCH', { name: 'Ya no permitido' }, editor)).status,
    403,
  );
  assert.equal(
    (await request(`/api/workspaces/${id}/members/${viewer.userId}`, 'DELETE', {}, owner)).status,
    204,
  );
  assert.equal((await request(`/api/workspaces/${id}`, 'GET', undefined, viewer)).status, 404);
});

test('el máximo de tres colaboradores resiste solicitudes concurrentes y no afecta otro espacio', async () => {
  const owner = await account('Límite');
  const otherOwner = await account('Otro espacio');
  const id = await workspace(owner);
  const otherId = await workspace(otherOwner);
  const people = await Promise.all([
    account('Uno'),
    account('Dos'),
    account('Tres'),
    account('Cuatro'),
  ]);
  const responses = await Promise.all(
    people.map((person) =>
      request(
        `/api/workspaces/${id}/members`,
        'POST',
        { email: person.email, role: 'editor' },
        owner,
      ),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 201, 201, 409]);
  assert.equal(await errorCode(responses.find((r) => r.status === 409)!), 'MEMBER_LIMIT');
  assert.equal(
    (await database.query('SELECT user_id FROM workspace_members WHERE workspace_id = $1', [id]))
      .rows.length,
    3,
  );
  assert.equal(
    (
      await database.query('SELECT user_id FROM workspace_members WHERE workspace_id = $1', [
        otherId,
      ])
    ).rows.length,
    0,
  );
  const existing = people[responses.findIndex((r) => r.status === 201)]!;
  const duplicate = await request(
    `/api/workspaces/${id}/members`,
    'POST',
    { email: existing.email, role: 'viewer' },
    owner,
  );
  assert.equal(await errorCode(duplicate), 'ALREADY_MEMBER');
});

test('límites de intentos persisten en la base y devuelven Retry-After sin loguear secretos', async () => {
  for (let i = 0; i < 10; i++) {
    assert.equal(
      (
        await request('/api/auth/login', 'POST', {
          email: 'limited@ensambla.test',
          password: PASSWORD,
        })
      ).status,
      401,
    );
  }
  const limited = await request('/api/auth/login', 'POST', {
    email: 'limited@ensambla.test',
    password: PASSWORD,
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const stored = await database.query('SELECT key_hash FROM auth_rate_limits');
  assert.ok(stored.rows.every((row) => /^[a-f0-9]{64}$/.test(String(row.key_hash))));
  assert.doesNotMatch(
    JSON.stringify(logs),
    /Una frase larga|limited@|ensambla_session|csrfToken|scrypt\$/,
  );
});
