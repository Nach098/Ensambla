/** Pruebas de experiencias interactivas de la landing. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heroIdeas,
  heroPreview,
  stagePieces,
  stagePreview,
  arrangeStagePieces,
  createPieceSelection,
  bindHeroIdeas,
  bindPieceStage,
} from '../public/landing-play.js';

test('cada idea de portada presenta un sistema distinto y el CTA tiene una plantilla válida', () => {
  assert.equal(new Set(heroIdeas.map((i) => i.id)).size, 4);
  for (const idea of heroIdeas) {
    const html = heroPreview(idea.id);
    assert.match(html, new RegExp(`data-kind="${idea.kind}"`));
    assert.doesNotMatch(html, /\bundefined\b|\bNaN\b|LUMBRE|Cera de soja/);
  }
  assert.match(heroPreview('team'), /Alex/);
  assert.match(heroPreview('projects'), /Preparar propuesta/);
  assert.match(heroPreview('calculator'), /data-landing-calculator/);
});
test('las piezas se agregan, quitan y distribuyen sin duplicarse ni afectar la selección original', () => {
  const initial = ['table', 'form', 'metric'],
    selection = createPieceSelection(initial);
  selection.toggle('calculator');
  assert.deepEqual(selection.selected, ['table', 'form', 'metric', 'calculator']);
  selection.toggle('form');
  assert.deepEqual(selection.selected, ['table', 'metric', 'calculator']);
  const before = selection.selected;
  selection.mix();
  assert.deepEqual(new Set(selection.selected), new Set(before));
  assert.notDeepEqual(selection.selected, before);
  selection.selected.push('not-a-piece');
  assert.equal(selection.selected.includes('not-a-piece'), false);
  selection.toggle('unknown');
  assert.equal(selection.selected.length, 3);
  assert.deepEqual(initial, ['table', 'form', 'metric']);
  for (const p of [...selection.selected]) selection.toggle(p);
  assert.match(stagePreview(selection.selected), /Elegí una pieza/);
  selection.reset();
  assert.deepEqual(selection.selected, initial);
});
test('ninguna combinación ni orden de 1 a 4 piezas deja media fila vacía', () => {
  const ids = stagePieces.map((p) => p.id);
  function check(sequence) {
    const before = [...sequence],
      layout = arrangeStagePieces(sequence);
    assert.deepEqual(sequence, before);
    assert.deepEqual(new Set(layout.map((p) => p.id)), new Set(sequence));
    assert.equal(layout.length, sequence.length);
    let occupied = 0,
      rows = 0;
    for (const piece of layout) {
      assert.ok(occupied + piece.span <= 2, `Fila incompleta antes de ${piece.id}: ${sequence}`);
      occupied += piece.span;
      if (occupied === 2) {
        occupied = 0;
        rows++;
      }
    }
    assert.equal(occupied, 0, `Última fila incompleta: ${sequence}`);
    assert.equal(
      rows,
      Math.ceil(sequence.length / 2),
      `La selección ocupa más filas de las necesarias: ${sequence}`,
    );
    const html = stagePreview(sequence),
      rendered = [...html.matchAll(/stage-span-(\d)" data-stage-block="([^"]+)"/g)].map((m) => ({
        id: m[2],
        span: Number(m[1]),
      }));
    assert.deepEqual(rendered, layout);
  }
  function visit(sequence, remaining) {
    if (sequence.length) check(sequence);
    for (const id of remaining)
      visit(
        [...sequence, id],
        remaining.filter((p) => p !== id),
      );
  }
  visit([], ids);
});
test('dos o cuatro piezas se agrupan de a dos; una pieza sola ocupa todo el ancho', () => {
  assert.deepEqual(arrangeStagePieces(['form', 'table', 'metric']), [
    { id: 'form', span: 1 },
    { id: 'metric', span: 1 },
    { id: 'table', span: 2 },
  ]);
  assert.deepEqual(arrangeStagePieces(['table', 'metric']), [
    { id: 'table', span: 1 },
    { id: 'metric', span: 1 },
  ]);
  assert.deepEqual(
    arrangeStagePieces(['table', 'form', 'metric', 'calculator']),
    ['table', 'form', 'metric', 'calculator'].map((id) => ({ id, span: 1 })),
  );
  assert.deepEqual(arrangeStagePieces(['metric']), [{ id: 'metric', span: 2 }]);
  assert.deepEqual(arrangeStagePieces(['unknown', 'form', 'form']), [{ id: 'form', span: 2 }]);
  assert.match(stagePreview(['unknown']), /Elegí una pieza/);
});
function rendererTarget() {
  return {
    isConnected: true,
    firstElementChild: null,
    html: '',
    set innerHTML(value) {
      this.html = value;
    },
    get innerHTML() {
      return this.html;
    },
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
  };
}
function tab(id) {
  return {
    dataset: { heroIdea: id },
    attrs: {},
    tabIndex: -1,
    classList: { toggle() {} },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    focus() {
      this.focused = true;
    },
  };
}
test('cambiar la idea actualiza solo la vista; teclado y foco permanecen en los controles', () => {
  const preview = rendererTarget(),
    tabs = heroIdeas.map((i) => tab(i.id)),
    listeners = new Map(),
    hero = {
      dataset: {},
      querySelector: () => preview,
      querySelectorAll: () => tabs,
      contains: () => true,
      addEventListener: (n, f) => listeners.set(n, f),
      removeEventListener: (n) => listeners.delete(n),
    };
  const controller = bindHeroIdeas(hero, { reduced: () => true });
  controller.choose('team');
  assert.equal(controller.active, 'team');
  assert.equal(tabs[1].attrs['aria-selected'], 'true');
  assert.equal(tabs[0].tabIndex, -1);
  assert.match(preview.html, /Alex/);
  let prevented = false;
  listeners.get('keydown')({
    target: tabs[1],
    key: 'End',
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(controller.active, 'calculator');
  assert.equal(tabs[3].focused, true);
  assert.equal(preview.attrs['aria-labelledby'], 'idea-calculator');
  controller.choose('missing');
  assert.equal(controller.active, 'calculator');
  controller.destroy();
  assert.equal(listeners.size, 0);
});
test('la calculadora de portada calcula al enviar y rechaza valores incompletos', () => {
  const preview = rendererTarget(),
    listeners = new Map(),
    hero = {
      dataset: {},
      querySelector: () => preview,
      querySelectorAll: () => heroIdeas.map((i) => tab(i.id)),
      contains: () => true,
      addEventListener: (n, f) => listeners.set(n, f),
      removeEventListener: (n) => listeners.delete(n),
    },
    controller = bindHeroIdeas(hero, { reduced: () => true });
  const output = { textContent: '' },
    form = {
      elements: { hours: { value: '3' }, rate: { value: '6500' } },
      querySelector: () => output,
    };
  const event = {
    target: { closest: () => form },
    preventDefault() {
      this.prevented = true;
    },
  };
  listeners.get('submit')(event);
  assert.equal(event.prevented, true);
  assert.match(output.textContent, /19\.500/);
  form.elements.hours.value = '';
  listeners.get('submit')(event);
  assert.match(output.textContent, /válidos/);
  controller.destroy();
});
test('los controles de piezas y el cierre de un bloque operan sobre la misma selección', () => {
  const grid = rendererTarget(),
    controls = stagePieces.map((p) => ({
      dataset: { togglePiece: p.id },
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      classList: { toggle() {} },
    })),
    status = { textContent: '' },
    mix = { disabled: false },
    listeners = new Map();
  const stage = {
      querySelector: (s) =>
        s === '[data-stage-grid]' ? grid : s === '[data-stage-mix]' ? mix : status,
      querySelectorAll: () => controls,
      contains: () => true,
      addEventListener: (n, f) => listeners.set(n, f),
      removeEventListener: (n) => listeners.delete(n),
    },
    controller = bindPieceStage(stage, { reduced: () => true });
  const click = (id, attr = 'data-toggle-piece') =>
    listeners.get('click')({
      target: {
        closest: () => ({ dataset: { togglePiece: id }, hasAttribute: (k) => k === attr }),
      },
    });
  click('calculator');
  assert.match(grid.html, /data-stage-block="calculator"/);
  assert.equal(controls[3].attrs['aria-pressed'], 'true');
  click('form');
  assert.doesNotMatch(grid.html, /data-stage-block="form"/);
  const before = controller.selection.selected;
  click(null, 'data-stage-mix');
  assert.notDeepEqual(controller.selection.selected, before);
  click(null, 'data-stage-reset');
  assert.deepEqual(controller.selection.selected, ['table', 'form', 'metric']);
  assert.match(status.textContent, /3 piezas/);
  controller.destroy();
  assert.equal(listeners.size, 0);
});
