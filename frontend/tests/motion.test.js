/** Pruebas de transiciones de pantallas y diálogos. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer, createDialogMotion } from '../public/motion.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function element() {
  return {
    firstElementChild: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    animations: [],
    animate(frames, options) {
      const d = deferred();
      const a = {
        frames,
        options,
        finished: d.promise,
        cancel() {
          d.reject(new Error('cancelled'));
        },
        complete() {
          d.resolve();
        },
      };
      this.animations.push(a);
      return a;
    },
  };
}

test('movimiento reducido actualiza inmediatamente y no inicia animaciones', async () => {
  const el = element();
  let n = 0;
  const update = createRenderer(el, { doc: {}, reduced: () => true });
  await update(() => n++);
  assert.equal(n, 1);
  assert.equal(el.animations.length, 0);
});
test('la primera carga no espera una animación', async () => {
  const el = element();
  el.firstElementChild = null;
  let n = 0;
  await createRenderer(el, { doc: {}, reduced: () => false })(() => n++);
  assert.equal(n, 1);
  assert.equal(el.animations.length, 0);
});
test('si falla el comienzo de una transición nativa, actualiza una sola vez', async () => {
  const el = element();
  let n = 0;
  const update = createRenderer(el, {
    doc: {
      startViewTransition(commit) {
        commit();
        throw new Error('unsupported');
      },
    },
    reduced: () => false,
  });
  await update(() => n++);
  assert.equal(n, 1);
});
test('una transición nativa anterior se puede interrumpir sin perder la actualización', async () => {
  const el = element(),
    transitions = [];
  let n = 0;
  const doc = {
    startViewTransition(commit) {
      commit();
      const d = deferred();
      const t = {
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        finished: d.promise,
        skipped: false,
        skipTransition() {
          this.skipped = true;
          d.resolve();
        },
        complete() {
          d.resolve();
        },
      };
      transitions.push(t);
      return t;
    },
  };
  const update = createRenderer(el, { doc, reduced: () => false });
  const a = update(() => n++),
    b = update(() => n++);
  transitions[1].complete();
  await Promise.all([a, b]);
  assert.equal(n, 2);
  assert.equal(transitions[0].skipped, true);
});
test('la alternativa animada conserva solo el último cambio rápido', async () => {
  const el = element(),
    changes = [];
  const update = createRenderer(el, { doc: {}, reduced: () => false });
  const first = update(() => changes.push('viejo'));
  const second = update(() => changes.push('actual'));
  el.animations[1].complete();
  await new Promise((resolve) => setImmediate(resolve));
  el.animations.at(-1).complete();
  await Promise.all([first, second]);
  assert.deepEqual(changes, ['actual']);
});
test('la alternativa de reordenamiento mueve las piezas a su nueva posición', async () => {
  const el = element(),
    card = element();
  card.dataset = { block: 'one' };
  let y = 100;
  card.getBoundingClientRect = () => ({ left: 0, top: y });
  el.querySelectorAll = () => [card];
  const result = createRenderer(el, { doc: {}, reduced: () => false })(
    () => {
      y = 20;
    },
    { reorder: true },
  );
  assert.equal(card.animations[0].frames[0].transform, 'translate(0px,80px)');
  card.animations[0].complete();
  await result;
});
test('el diálogo bloquea dobles envíos durante la salida y vuelve a activarse al abrir', () => {
  const dialog = {
    open: false,
    inert: false,
    className: '',
    innerHTML: '',
    querySelector: () => null,
    getBoundingClientRect: () => ({ height: 200 }),
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };
  const motion = createDialogMotion(dialog, { reduced: () => true });
  motion.open('<h2>Uno</h2>', false);
  assert.equal(dialog.open, true);
  assert.equal(dialog.inert, false);
  motion.close();
  assert.equal(dialog.open, false);
  assert.equal(dialog.inert, true);
  motion.open('<h2>Dos</h2>', true);
  assert.equal(dialog.inert, false);
  assert.equal(dialog.className, 'wide-modal');
});
test('cambiar el ancho de un bloque también anima su tamaño en la alternativa sin View Transitions', async () => {
  const el = element(),
    card = element();
  card.dataset = { block: 'one' };
  let width = 200;
  card.getBoundingClientRect = () => ({ left: 10, top: 20, width, height: 150 });
  el.querySelectorAll = () => [card];
  const result = createRenderer(el, { doc: {}, reduced: () => false })(
    () => {
      width = 400;
    },
    { reorder: true },
  );
  assert.equal(card.animations[0].frames[0].transform, 'translate(0px,0px) scale(0.5,1)');
  assert.equal(card.animations[0].frames[0].transformOrigin, 'top left');
  card.animations[0].complete();
  await result;
});
test('las piezas de la landing se deslizan usando sus identificadores al mezclar la distribución', async () => {
  const el = element(),
    table = element(),
    form = element();
  let mixed = false;
  table.dataset = { stageBlock: 'table' };
  form.dataset = { stageBlock: 'form' };
  table.getBoundingClientRect = () => ({ left: mixed ? 300 : 0, top: 0, width: 280, height: 200 });
  form.getBoundingClientRect = () => ({ left: mixed ? 0 : 300, top: 0, width: 280, height: 200 });
  el.querySelectorAll = (selector) => {
    assert.equal(selector, '.stage-block[data-stage-block]');
    return mixed ? [form, table] : [table, form];
  };
  const render = createRenderer(el, {
    doc: {},
    native: false,
    reduced: () => false,
    pieceSelector: '.stage-block[data-stage-block]',
    pieceKey: (piece) => piece.dataset.stageBlock,
  });
  const finished = render(
    () => {
      mixed = true;
    },
    { reorder: true },
  );
  assert.equal(table.animations[0].frames[0].transform, 'translate(-300px,0px)');
  assert.equal(form.animations[0].frames[0].transform, 'translate(300px,0px)');
  table.animations[0].complete();
  form.animations[0].complete();
  await finished;
});
