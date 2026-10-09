/** Pruebas de actualización suave de resultados. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  animateResult,
  cancelResult,
  resultMarkup,
  showResultError,
} from '../public/result-motion.js';

function surface(value = 100) {
  const number = { textContent: '', dataset: { resultValue: String(value) } },
    announcement = { textContent: 'Total anterior' };
  const attrs = new Map();
  const output = {
    isConnected: true,
    ownerDocument: { hidden: false },
    attrs,
    querySelector: (s) =>
      s === '[data-result-value]'
        ? number
        : s === '[data-result-announcement]'
          ? announcement
          : null,
    setAttribute: (k, v) => attrs.set(k, v),
    closest: () => null,
  };
  return { output, number, announcement };
}
function timeline() {
  let now = 0,
    id = 0;
  const frames = new Map();
  return {
    clock: {
      now: () => now,
      request: (fn) => {
        const key = ++id;
        frames.set(key, fn);
        return key;
      },
      cancel: (key) => frames.delete(key),
    },
    frames,
    step(ms) {
      now = ms;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(now));
    },
  };
}
test('el resultado avanza suavemente y anuncia el valor final una sola vez', () => {
  const { output, number, announcement } = surface(13000),
    t = timeline();
  animateResult(output, 19500, {
    label: 'Estimación',
    clock: t.clock,
    reduced: () => false,
    duration: 500,
  });
  assert.equal(output.attrs.get('aria-busy'), 'true');
  t.step(150);
  const intermediate = Number(number.dataset.resultValue);
  assert.ok(intermediate > 13000 && intermediate < 19500);
  assert.equal(announcement.textContent, 'Total anterior');
  t.step(500);
  assert.equal(Number(number.dataset.resultValue), 19500);
  assert.match(number.textContent, /19\.500/);
  assert.match(announcement.textContent, /Estimación:.*19\.500/);
  assert.equal(output.attrs.get('aria-busy'), 'false');
  assert.equal(t.frames.size, 0);
});
test('un recálculo rápido parte del número visible y conserva solo el último resultado', () => {
  const { output, number, announcement } = surface(100),
    t = timeline();
  animateResult(output, 200, { clock: t.clock, reduced: () => false, duration: 500 });
  t.step(100);
  const visible = Number(number.dataset.resultValue),
    stale = [...t.frames.values()][0];
  animateResult(output, 50, {
    label: 'Costo',
    clock: t.clock,
    reduced: () => false,
    duration: 500,
  });
  assert.equal(t.frames.size, 1);
  stale(500);
  assert.equal(Number(number.dataset.resultValue), visible);
  t.step(250);
  assert.ok(Number(number.dataset.resultValue) < visible);
  assert.ok(Number(number.dataset.resultValue) > 50);
  assert.equal(announcement.textContent, 'Total anterior');
  t.step(650);
  assert.equal(Number(number.dataset.resultValue), 50);
  assert.match(announcement.textContent, /Costo:.*50/);
  assert.equal(t.frames.size, 0);
});
test('movimiento reducido, pausa y página oculta muestran el resultado sin iniciar cuadros', () => {
  for (const reason of ['reduced', 'paused', 'hidden']) {
    const { output, number, announcement } = surface(),
      t = timeline();
    output.closest = () => (reason === 'paused' ? {} : null);
    output.ownerDocument.hidden = reason === 'hidden';
    animateResult(output, 2.5, {
      label: 'Consumo',
      format: 'number',
      suffix: 'kg',
      clock: t.clock,
      reduced: () => reason === 'reduced',
    });
    assert.equal(t.frames.size, 0);
    assert.equal(Number(number.dataset.resultValue), 2.5);
    assert.equal(announcement.textContent, 'Consumo: 2,5 kg');
  }
});
test('quitar la pantalla, cancelar o mostrar un error detiene los cálculos pendientes', () => {
  for (const reason of ['removed', 'cancelled', 'error']) {
    const { output, number } = surface(),
      t = timeline();
    animateResult(output, 1000, { clock: t.clock, reduced: () => false });
    if (reason === 'removed') {
      output.isConnected = false;
      t.step(100);
    } else if (reason === 'cancelled') cancelResult(output);
    else showResultError(output, 'Revisá los valores.', { reduced: () => true });
    assert.equal(t.frames.size, 0);
    t.step(1000);
    assert.notEqual(Number(number.dataset.resultValue), 1000);
    assert.equal(output.attrs.get('aria-busy'), 'false');
  }
  assert.throws(() => animateResult(surface().output, Infinity), /número válido/);
});
test('las etiquetas y unidades propias se escapan y el valor visual no duplica el anuncio', () => {
  const markup = resultMarkup(6, {
    label: '<img src=x>',
    format: 'number',
    suffix: '<script>kg</script>',
  });
  assert.doesNotMatch(markup, /<img|<script/);
  assert.match(markup, /&lt;img/);
  assert.match(markup, /class="animated-number"[^>]*aria-hidden="true"/);
  assert.match(markup, /data-result-announcement/);
});
