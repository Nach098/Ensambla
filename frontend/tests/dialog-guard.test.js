/** Pruebas de selección y cierre seguro de diálogos. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDialogDismiss } from '../public/dialog-guard.js';

function fixture({ field = null } = {}) {
  const handlers = new Map();
  let closes = 0;
  const dialog = {
    open: true,
    inert: false,
    querySelector: () => field,
    getBoundingClientRect: () => ({ left: 100, right: 400, top: 100, bottom: 350 }),
    addEventListener: (n, h) => handlers.set(n, h),
    removeEventListener: (n) => handlers.delete(n),
  };
  const guard = bindDialogDismiss(dialog, () => {
    closes++;
    dialog.open = false;
  });
  const fire = (type, extra = {}) =>
    handlers.get(type)?.({
      target: dialog,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      detail: 1,
      ...extra,
    });
  const tap = () => {
    fire('pointerdown');
    fire('pointerup');
    fire('click');
  };
  return {
    dialog,
    guard,
    fire,
    tap,
    get closes() {
      return closes;
    },
  };
}
test('seleccionar desde un input y soltar afuera no cierra ni pierde lo escrito', () => {
  const field = { value: 'Mi nueva aplicación' },
    f = fixture({ field });
  f.fire('pointerdown', { target: field, clientX: 170, clientY: 130 });
  f.fire('pointermove', { clientX: 50, clientY: 130 });
  f.fire('pointerup', { clientX: 50, clientY: 130 });
  // Native click is retargeted to the shared ancestor: the dialog.
  f.fire('click', { clientX: 50, clientY: 130 });
  assert.equal(f.closes, 0);
  assert.equal(f.dialog.open, true);
  assert.equal(field.value, 'Mi nueva aplicación');
});
test('la captura implícita de un puntero táctil tampoco convierte la selección en cierre', () => {
  const field = { value: 'Mi idea' },
    f = fixture({ field });
  f.fire('pointerdown', { target: field, clientX: 150, clientY: 150, pointerType: 'touch' });
  f.fire('pointerup', { target: field, pointerType: 'touch' });
  f.fire('click', { pointerType: 'touch' });
  assert.equal(f.closes, 0);
});
test('un clic completo en el fondo cierra un diálogo informativo', () => {
  const f = fixture();
  f.tap();
  assert.equal(f.closes, 1);
  assert.equal(f.dialog.open, false);
});
test('los formularios y los pasos con campos requieren un cierre explícito', () => {
  for (const type of ['form', 'input', 'textarea', 'select', 'file']) {
    const field = { type, value: 'Trabajo pendiente' },
      f = fixture({ field });
    f.tap();
    assert.equal(f.closes, 0, type);
    assert.equal(field.value, 'Trabajo pendiente');
  }
});
test('empezar en el espacio interior del diálogo y soltar afuera no cierra', () => {
  const f = fixture();
  f.fire('pointerdown', { clientX: 120, clientY: 120 });
  f.fire('pointerup');
  f.fire('click');
  assert.equal(f.closes, 0);
});
test('empezar afuera y terminar adentro no cuenta como clic en el fondo', () => {
  const f = fixture();
  f.fire('pointerdown');
  f.fire('pointerup', { clientX: 120, clientY: 120 });
  f.fire('click', { clientX: 120, clientY: 120 });
  assert.equal(f.closes, 0);
});
test('un arrastre que vuelve al punto de inicio no se interpreta como clic', () => {
  const f = fixture();
  f.fire('pointerdown');
  f.fire('pointermove', { clientX: 85, clientY: 40 });
  f.fire('pointerup');
  f.fire('click');
  assert.equal(f.closes, 0);
});
test('cancelar un gesto o cambiar de paso limpia cualquier cierre pendiente', () => {
  for (const reset of [
    (f) => f.fire('pointercancel'),
    (f) => f.guard.reset(),
    (f) => f.fire('close'),
  ]) {
    const f = fixture();
    f.fire('pointerdown');
    f.fire('pointerup');
    reset(f);
    f.fire('click');
    assert.equal(f.closes, 0);
    f.tap();
    assert.equal(f.closes, 1);
  }
});
test('no cierran clics secundarios, otros punteros, teclado ni gestos incompletos', () => {
  const f = fixture();
  f.fire('pointerdown', { button: 2 });
  f.fire('pointerup', { button: 2 });
  f.fire('click', { button: 2 });
  f.fire('pointerdown', { isPrimary: false });
  f.fire('pointerup', { isPrimary: false });
  f.fire('click');
  f.fire('pointerdown');
  f.fire('pointerup', { pointerId: 2 });
  f.fire('click');
  f.fire('pointerdown');
  f.fire('pointerup');
  f.fire('click', { detail: 0 });
  f.fire('pointerdown');
  f.fire('click');
  assert.equal(f.closes, 0);
});
