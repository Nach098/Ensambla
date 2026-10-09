/** Pruebas de vistas del constructor y navegación. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, blankApp, simpleApp } from '../public/domain.js';
import { landing } from '../public/landing.js';
import { workspace, admin, shell } from '../public/pages.js';
import { builder } from '../public/builder.js';
import { runtime } from '../public/runtime.js';
import { accessPage } from '../public/access.js';
test('renderiza landing y espacio con rutas reales', () => {
  const s = seedState();
  assert.match(landing(), /id="planes"/);
  assert.match(workspace(s), new RegExp(s.apps[0].id));
  assert.doesNotMatch(shell(s, workspace(s), 'espacio', {}), /id="role-select"/);
  assert.match(shell(s, workspace(s), 'espacio', {}), /data-account-action="logout"/);
});
test('renderiza todas las secciones del constructor en PC y móvil', () => {
  const s = seedState(),
    a = s.apps[0];
  for (const device of ['desktop', 'mobile'])
    for (const tab of ['design', 'data', 'processes', 'appearance', 'integrations']) {
      const html = builder(a, { tab, screen: 'home', device, selected: a.blocks[0].id }, 'owner');
      assert.ok(html.length > 1000);
      assert.match(html, /id="main"/);
      assert.doesNotMatch(html, /\bundefined\b|\bNaN\b/);
    }
});
test('aplicación en uso: pantallas de taller y plantillas generales', () => {
  const a = seedState().apps[0];
  for (const screen of ['home', 'inventory', 'orders', 'recipes'])
    assert.match(runtime(a, { screen, runtimeDevice: 'mobile' }, 'owner'), /id="main"/);
  for (const a of [blankApp(), simpleApp('attendance'), simpleApp('tasks')])
    assert.doesNotMatch(
      builder(a, { tab: 'design', screen: 'home', device: 'desktop' }, 'owner'),
      /\bundefined\b/,
    );
});
test('la vista de lectura oculta las acciones de mutación en uso', () => {
  const a = seedState().apps[0],
    r = runtime(a, { screen: 'inventory' }, 'reader');
  assert.doesNotMatch(r, /data-action="(add-record|edit-record|delete-record)"/);
  const account = {
    user: { displayName: 'Lector', email: 'lector@example.test' },
    workspaces: [{ id: 'one', name: 'Espacio', role: 'viewer' }],
    activeWorkspaceId: 'one',
    members: [],
    membersStatus: 'idle',
  };
  assert.doesNotMatch(admin(account), /data-account-form="member"/);
});
test('escapa nombres de usuario y textos al renderizar', () => {
  const s = seedState();
  s.apps[0].name = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(workspace(s), /<img src=x/);
  assert.match(workspace(s), /&lt;img/);
});
test('los escenarios de acceso deshabilitan la operación cuando vence el permiso', () => {
  const s = seedState();
  for (const id of ['expired', 'trial', 'unpaid', 'clock']) {
    const html = accessPage(s, { accessScenario: id });
    assert.match(html, /data-action="access-operation" disabled/);
    assert.match(html, /Elegí una situación y revisá el estado del acceso/);
    assert.doesNotMatch(html, /\bundefined\b|\bNaN\b/);
  }
  assert.doesNotMatch(
    accessPage(s, { accessScenario: 'offline' }),
    /data-action="access-operation" disabled/,
  );
});
