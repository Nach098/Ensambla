/** Actualización visual de cálculos. Interpola resultados y cancela animaciones anteriores sin perder el valor final. */
import { esc, fmt, money } from './ui.js';
import { EASE, reducedMotion } from './motion.js';

const active = new WeakMap();
const browserClock = {
  now: () => globalThis.performance?.now() ?? Date.now(),
  request: (callback) => globalThis.requestAnimationFrame(callback),
  cancel: (id) => globalThis.cancelAnimationFrame(id),
};
const formatResult = (value, { format = 'money', suffix = '' } = {}) =>
  `${format === 'number' ? fmt(value) : money(value)}${suffix ? ` ${suffix}` : ''}`;
const motionOff = (output, reduced) =>
  reduced() || output.ownerDocument?.hidden || !!output.closest?.('[data-motion-paused="true"]');

export function resultMarkup(value, { label = 'Total', format = 'money', suffix = '' } = {}) {
  const text = formatResult(value, { format, suffix });
  return `<span class="calculation-label" aria-hidden="true">${esc(label)}</span><strong class="animated-number" data-result-value="${esc(value)}" aria-hidden="true">${esc(text)}</strong><span class="sr-only" data-result-announcement>${esc(label)}: ${esc(text)}</span>`;
}
export function cancelResult(output) {
  const current = active.get(output);
  if (!current) return;
  if (current.frame !== null) current.clock.cancel(current.frame);
  current.animation?.cancel();
  active.delete(output);
  output.setAttribute?.('aria-busy', 'false');
}
function pulse(output) {
  if (!output.animate) return null;
  try {
    const animation = output.animate(
      [
        { opacity: 0.65, transform: 'translateY(3px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 280, easing: EASE },
    );
    animation.finished?.catch(() => {});
    return animation;
  } catch {
    return null;
  }
}
export function animateResult(
  output,
  target,
  {
    label = 'Total',
    format = 'money',
    suffix = '',
    reduced = reducedMotion,
    clock = browserClock,
    duration = 460,
  } = {},
) {
  if (!output || !Number.isFinite(target))
    throw new Error('El resultado debe ser un número válido.');
  const previous = active.get(output)?.value;
  cancelResult(output);
  const options = { label, format, suffix },
    finalText = formatResult(target, options);
  if (!output.querySelector) {
    output.textContent = `${label}: ${finalText}`;
    return;
  }
  let number = output.querySelector('[data-result-value]'),
    announcement = output.querySelector('[data-result-announcement]');
  const from = previous ?? Number(number?.dataset.resultValue);
  if (!number || !announcement) {
    output.innerHTML = resultMarkup(target, options);
    number = output.querySelector('[data-result-value]');
    announcement = output.querySelector('[data-result-announcement]');
  }
  function write(value) {
    number.textContent = formatResult(value, options);
    number.dataset.resultValue = String(value);
  }
  function finish() {
    write(target);
    announcement.textContent = `${label}: ${finalText}`;
    output.setAttribute?.('aria-busy', 'false');
  }
  if (
    motionOff(output, reduced) ||
    !Number.isFinite(from) ||
    from === target ||
    duration <= 0 ||
    (clock === browserClock && !globalThis.requestAnimationFrame)
  ) {
    finish();
    if (!motionOff(output, reduced)) pulse(output);
    return;
  }
  const state = { value: from, frame: null, clock, animation: pulse(output) },
    started = clock.now();
  active.set(output, state);
  output.setAttribute?.('aria-busy', 'true');
  function tick(now) {
    if (active.get(output) !== state) return;
    if (output.isConnected === false) {
      cancelResult(output);
      return;
    }
    const progress = Math.max(0, Math.min(1, (now - started) / duration));
    if (progress === 1 || motionOff(output, reduced)) {
      finish();
      active.delete(output);
      state.frame = null;
      return;
    }
    state.value = from + (target - from) * (1 - Math.pow(1 - progress, 3));
    write(state.value);
    state.frame = clock.request(tick);
  }
  state.frame = clock.request(tick);
}
export function showResultError(output, message, { reduced = reducedMotion } = {}) {
  cancelResult(output);
  output.setAttribute?.('aria-busy', 'false');
  if (output.querySelector) output.innerHTML = `<span class="result-error">${esc(message)}</span>`;
  else output.textContent = message;
  if (!motionOff(output, reduced)) pulse(output);
}
