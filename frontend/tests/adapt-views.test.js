/** Pruebas de formularios y vistas adaptables. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { candleApp, simpleApp } from '../public/domain.js';
import { renderBlock, inputField, runtime, queryKey } from '../public/runtime.js';
import { builder } from '../public/builder.js';
import {
  filterBar,
  taxonomyModal,
  updateClassification,
  readRecordForm,
} from '../public/adapt-ui.js';

test('muestra etiquetas de categorías y aplica condiciones guardadas más filtros temporales', () => {
  const a = candleApp(),
    c = a.collections[0],
    t = c.taxonomy,
    b = {
      id: 'b',
      type: 'table',
      collection: c.id,
      title: 'Ceras',
      filters: [{ field: t.subcategoryKey, op: 'eq', value: 'wax' }],
    };
  const html = renderBlock(a, b, {
    interactive: true,
    query: { filters: [{ field: 'qty', op: 'gt', value: '1000' }] },
  });
  assert.match(html, /Parafina/);
  assert.doesNotMatch(html, /Cera de soja<\/span>/);
  assert.match(html, />Ceras<\/td>/);
  assert.match(html, /data-block-results="b"/);
  assert.equal(c.rows.length, 6);
});
test('los filtros de dos bloques son independientes y lectura conserva la consulta', () => {
  const a = candleApp(),
    c = a.collections[0],
    t = c.taxonomy;
  a.blocks = [
    { id: 'one', type: 'table', title: 'Uno', collection: c.id, screen: 'home', span: 3 },
    {
      id: 'two',
      type: 'metric',
      title: 'Dos',
      collection: c.id,
      screen: 'home',
      span: 3,
      metric: { kind: 'count' },
    },
  ];
  const html = runtime(
    a,
    {
      screen: 'home',
      blockQueries: {
        [queryKey(a.id, 'one')]: {
          filters: [{ field: t.subcategoryKey, op: 'eq', value: 'mold' }],
        },
        [queryKey(a.id, 'two')]: { filters: [{ field: t.subcategoryKey, op: 'eq', value: 'wax' }] },
      },
    },
    'reader',
  );
  assert.match(html, /Molde cilíndrico/);
  assert.match(html, /2 registros en esta vista/);
  assert.doesNotMatch(html, /data-action="(edit-record|add-record|delete-record)"/);
  assert.match(html, /data-query-scope="block"/);
});
test('formularios generales conservan el campo estado y personalizan el botón', () => {
  const a = simpleApp('tasks'),
    c = a.collections[0],
    html = renderBlock(
      a,
      {
        id: 'form',
        type: 'form',
        collection: c.id,
        title: 'Nuevo pendiente',
        submitLabel: 'Crear tarea',
      },
      { interactive: true },
    );
  assert.match(html, /name="status"/);
  assert.match(html, /Crear tarea<\/button>/);
});
test('formularios de clasificación editan solo subcategorías del padre seleccionado', () => {
  const a = candleApp(),
    c = a.collections[0],
    t = c.taxonomy,
    f = c.fields.find((f) => f.key === t.subcategoryKey);
  const html = inputField(a, c, f, 'wax', 'modal-', { [t.categoryKey]: 'supplies' });
  assert.match(html, /value="wax" selected/);
  assert.doesNotMatch(html, /value="mold"/);
  assert.match(inputField(a, c, f), /data-classification-child[^>]*disabled/);
  const untouched = { value: 'Escribiendo una nota' },
    child = { dataset: { collection: c.id }, value: 'wax', disabled: false, innerHTML: '' },
    form = { querySelectorAll: () => [child], note: untouched };
  updateClassification(form, c, 'tools');
  assert.equal(child.value, '');
  assert.match(child.innerHTML, /Moldes/);
  assert.doesNotMatch(child.innerHTML, /Ceras/);
  assert.equal(untouched.value, 'Escribiendo una nota');
  child.value = 'mold';
  updateClassification(form, c, '');
  assert.equal(child.disabled, true);
  assert.equal(child.value, '');
});
test('filtros rápidos de subcategoría dependen de la categoría y usan los nombres propios', () => {
  const c = candleApp().collections[0],
    t = c.taxonomy,
    scope = { kind: 'data', collection: c.id };
  const empty = filterBar(c, {}, scope);
  assert.match(empty, new RegExp(`data-query-field="${t.subcategoryKey}"[^>]*disabled`));
  const chosen = filterBar(
    c,
    { filters: [{ field: t.categoryKey, op: 'eq', value: 'tools' }] },
    scope,
  );
  assert.match(chosen, /Moldes/);
  assert.doesNotMatch(chosen, /<option[^>]+>Ceras<\/option>/);
  const saved = filterBar(c, {}, scope, undefined, [
    { field: t.categoryKey, op: 'eq', value: 'tools' },
  ]);
  assert.match(saved, /Moldes/);
  assert.doesNotMatch(saved, new RegExp(`data-query-field="${t.subcategoryKey}"[^>]*disabled`));
});
test('al limpiar la categoría de un registro también guarda vacía la subcategoría deshabilitada', () => {
  const a = candleApp(),
    c = a.collections[0],
    t = c.taxonomy,
    old = c.rows[0],
    controls = c.fields.map((f) => ({ name: f.key, disabled: f.key === t.subcategoryKey })),
    values = { ...old, [t.categoryKey]: '' };
  const form = { querySelectorAll: () => controls },
    fd = { get: (k) => values[k], has: (k) => !!values[k] };
  const result = readRecordForm(form, c, old, fd);
  assert.equal(result[t.categoryKey], '');
  assert.equal(result[t.subcategoryKey], '');
  assert.equal(old[t.subcategoryKey], 'wax');
});
test('un formulario respeta campos fijos y detecta obligatorios ocultos sin mutar registros', () => {
  const a = candleApp(),
    c = a.collections[1],
    old = { ...c.rows[0], producedAt: '2026-10-09', status: 'Terminado' },
    controls = c.fields.map((f) => ({ name: f.key, disabled: ['product', 'qty'].includes(f.key) })),
    values = { ...old, customer: 'Nuevo nombre', qty: '99' };
  const fd = { get: (k) => values[k], has: (k) => !!values[k] },
    result = readRecordForm({ querySelectorAll: () => controls }, c, old, fd);
  assert.equal(result.qty, 3);
  assert.equal(result.customer, 'Nuevo nombre');
  assert.equal(old.customer, c.rows[0].customer);
  assert.throws(
    () =>
      readRecordForm({ querySelectorAll: () => [{ name: 'qty' }] }, c, null, {
        get: () => 2,
        has: () => false,
      }),
    /Cliente.*obligatorio/,
  );
});
test('cada tipo de bloque expone su configuración y los nombres propios se escapan', () => {
  const a = candleApp(),
    c = a.collections[0];
  c.taxonomy.groups[0].name = '<script>alert(1)</script>';
  assert.doesNotMatch(taxonomyModal(c, c.taxonomy.groups), /<script>/);
  assert.match(taxonomyModal(c, c.taxonomy.groups), /&lt;script&gt;/);
  for (const type of ['table', 'form', 'metric', 'calculator']) {
    const b = { id: 'chosen', type, title: 'Configuración', screen: 'home', collection: c.id };
    a.blocks = [b];
    const html = builder(
      a,
      { tab: 'design', screen: 'home', device: 'desktop', selected: b.id },
      'owner',
    );
    assert.doesNotMatch(html, /\bundefined\b|\bNaN\b|<script>/);
    assert.match(
      html,
      new RegExp(
        type === 'metric'
          ? 'name="metricKind"'
          : type === 'calculator'
            ? 'name="operation"'
            : type === 'form'
              ? 'name="submitLabel"'
              : 'data-query-scope="saved"',
      ),
    );
  }
});
