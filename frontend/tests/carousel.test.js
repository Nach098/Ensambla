/** Pruebas de recorrido y controles de carruseles. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bindCarousel, createAutoplay } from '../public/carousel.js';
import { landing } from '../public/landing.js';

function surface() {
  const listeners = new Map(),
    trackListeners = new Map(),
    calls = [],
    slides = Array.from({ length: 4 }, (_, i) => ({
      offsetLeft: i * 600,
      dataset: { title: `Ejemplo ${i + 1}` },
    }));
  const track = {
    children: slides,
    scrollLeft: 0,
    scrollTo: (o) => {
      calls.push(o);
      track.scrollLeft = o.left;
    },
    addEventListener: (name, fn) => trackListeners.set(name, fn),
    removeEventListener: (name) => trackListeners.delete(name),
  };
  const prev = { disabled: false, dataset: { carouselControl: 'prev' }, hasAttribute: () => false },
    next = { disabled: false, dataset: { carouselControl: 'next' }, hasAttribute: () => false };
  const dots = slides.map((s, i) => ({
      dataset: { carouselIndex: String(i) },
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      classList: { toggle() {} },
      hasAttribute: (k) => k === 'data-carousel-index',
    })),
    status = {
      textContent: '',
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    },
    toggle = {
      dataset: {},
      attrs: {},
      textContent: '',
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      hasAttribute: (k) => k === 'data-carousel-toggle',
    };
  const element = {
    querySelector: (s) =>
      s === '[data-carousel-track]'
        ? track
        : s.includes('prev')
          ? prev
          : s.includes('next')
            ? next
            : s === '[data-carousel-toggle]'
              ? toggle
              : status,
    querySelectorAll: () => dots,
    contains: (el) => [prev, next, toggle, ...dots].includes(el),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  return {
    element,
    track,
    prev,
    next,
    toggle,
    dots,
    status,
    calls,
    listeners,
    trackListeners,
    click: (control) => listeners.get('click')({ target: { closest: () => control } }),
  };
}
test('navega manualmente, marca límites y cambia el anuncio sin mover el foco', () => {
  const s = surface(),
    c = bindCarousel(s.element, { reduced: () => false });
  assert.equal(s.prev.disabled, true);
  assert.equal(s.calls.length, 0);
  assert.equal(
    s.track.children.filter((slide) => slide.dataset.carouselActive === 'true').length,
    1,
  );
  s.click(s.next);
  assert.equal(c.index, 1);
  assert.deepEqual(s.calls[0], { left: 600, behavior: 'smooth' });
  assert.equal(s.dots[1].attrs['aria-current'], 'true');
  assert.equal(s.track.children[1].dataset.carouselActive, 'true');
  assert.equal(s.track.children[0].dataset.carouselActive, 'false');
  assert.match(s.status.textContent, /2 de 4/);
  s.click(s.dots[3]);
  assert.equal(c.index, 3);
  assert.equal(s.next.disabled, true);
  s.click(s.next);
  assert.equal(c.index, 3);
  c.destroy();
  assert.equal(s.listeners.size, 0);
  assert.equal(s.trackListeners.size, 0);
});
test('admite flechas, inicio y fin desde la pista y respeta movimiento reducido', () => {
  const s = surface(),
    c = bindCarousel(s.element, { reduced: () => true });
  let prevented = 0;
  for (const key of ['End', 'Home', 'ArrowLeft', 'ArrowRight'])
    s.trackListeners.get('keydown')({ target: s.track, key, preventDefault: () => prevented++ });
  assert.equal(c.index, 1);
  assert.equal(prevented, 4);
  assert.equal(
    s.calls.every((o) => o.behavior === 'auto'),
    true,
  );
  s.trackListeners.get('keydown')({
    target: s.next,
    key: 'ArrowRight',
    preventDefault: () => assert.fail('No debe interceptar el teclado del botón'),
  });
  assert.equal(c.index, 1);
  c.destroy();
});
test('un deslizamiento nativo actualiza el índice y el estado de los controles', async () => {
  const s = surface(),
    c = bindCarousel(s.element);
  s.track.scrollLeft = 1795;
  s.trackListeners.get('scroll')();
  await new Promise((resolve) => setTimeout(resolve, 160));
  assert.equal(c.index, 3);
  assert.equal(s.next.disabled, true);
  c.destroy();
});
test('la landing ofrece varios usos con navegación, imágenes y CTAs reales', () => {
  const html = landing();
  assert.equal((html.match(/aria-roledescription="diapositiva"/g) || []).length, 4);
  for (const kind of ['candles', 'attendance', 'tasks', 'blank'])
    assert.match(html, new RegExp(`data-action="choose-template" data-kind="${kind}"`));
  assert.match(html, /data-carousel-status aria-live="polite"/);
  assert.match(html, /data-carousel-toggle/);
  assert.match(html, /data-motion-toggle/);
  assert.match(html, /data-landing-photo="commerce"/);
  assert.match(html, /data-landing-photo="team"/);
  const hero = html.split('<section class="hero wrap">')[1].split('</section>')[0];
  assert.doesNotMatch(hero, /Cera|LUMBRE|vela/i);
});
function clock() {
  let next = 0;
  const tasks = new Map();
  return {
    set(fn) {
      const id = ++next;
      tasks.set(id, fn);
      return id;
    },
    clear: (id) => tasks.delete(id),
    get count() {
      return tasks.size;
    },
    tick() {
      const entries = [...tasks.entries()];
      tasks.clear();
      entries.forEach(([id, fn]) => fn());
    },
  };
}
test('el recorrido automático mantiene un único timer y se detiene por hover, foco o página oculta', () => {
  const timer = clock();
  let advances = 0;
  const auto = createAutoplay({
    delay: 9000,
    advance: () => advances++,
    reduced: () => false,
    clock: timer,
  });
  assert.equal(timer.count, 1);
  timer.tick();
  assert.equal(advances, 1);
  assert.equal(timer.count, 1);
  auto.setPaused('hover', true);
  assert.equal(timer.count, 0);
  auto.setPaused('focus', true);
  auto.setPaused('hover', false);
  assert.equal(timer.count, 0);
  auto.setPaused('focus', false);
  assert.equal(timer.count, 1);
  auto.setPaused('hidden', true);
  assert.equal(auto.running, false);
  timer.tick();
  assert.equal(advances, 1);
  auto.setPaused('hidden', false);
  auto.restart();
  auto.restart();
  assert.equal(timer.count, 1);
  auto.destroy();
  assert.equal(timer.count, 0);
  auto.restart();
  assert.equal(timer.count, 0);
});
test('el recorrido respeta movimiento reducido y la pausa explícita sin volver a activarse solo', () => {
  const timer = clock();
  let reduced = true,
    advances = 0;
  const auto = createAutoplay({
    delay: 9000,
    advance: () => advances++,
    reduced: () => reduced,
    clock: timer,
  });
  assert.equal(timer.count, 0);
  reduced = false;
  auto.restart();
  assert.equal(timer.count, 1);
  auto.setPaused('user', true);
  auto.setPaused('offscreen', true);
  auto.setPaused('offscreen', false);
  assert.equal(timer.count, 0);
  auto.setPaused('user', false);
  timer.tick();
  assert.equal(advances, 1);
  reduced = true;
  timer.tick();
  assert.equal(advances, 1);
  assert.equal(timer.count, 0);
  auto.destroy();
});
test('el carrusel pausa por visibilidad, foco, hover y control global, y libera sus listeners', () => {
  const s = surface(),
    timer = clock(),
    docListeners = new Map(),
    pageListeners = new Map(),
    doc = {
      hidden: false,
      addEventListener: (n, f) => docListeners.set(n, f),
      removeEventListener: (n) => docListeners.delete(n),
    },
    page = {
      dataset: { motionPaused: 'false' },
      addEventListener: (n, f) => pageListeners.set(n, f),
      removeEventListener: (n) => pageListeners.delete(n),
    };
  let observation;
  class Observer {
    constructor(callback) {
      this.callback = callback;
      observation = this;
    }
    observe() {}
    disconnect() {
      this.closed = true;
    }
  }
  s.element.dataset = { carouselAutoplay: '9000' };
  s.element.closest = () => page;
  const carousel = bindCarousel(s.element, { reduced: () => false, doc, Observer, clock: timer });
  assert.equal(timer.count, 0);
  observation.callback([{ isIntersecting: true }]);
  timer.tick();
  assert.equal(carousel.index, 1);
  assert.equal(s.status.attrs['aria-live'], 'off');
  s.listeners.get('mouseenter')();
  assert.equal(timer.count, 0);
  s.listeners.get('focusin')();
  s.listeners.get('mouseleave')();
  assert.equal(timer.count, 0);
  s.listeners.get('focusout')({ relatedTarget: null });
  assert.equal(timer.count, 1);
  doc.hidden = true;
  docListeners.get('visibilitychange')();
  assert.equal(timer.count, 0);
  doc.hidden = false;
  docListeners.get('visibilitychange')();
  page.dataset.motionPaused = 'true';
  pageListeners.get('ensambla-motion')();
  assert.equal(timer.count, 0);
  page.dataset.motionPaused = 'false';
  pageListeners.get('ensambla-motion')();
  s.click(s.toggle);
  assert.equal(timer.count, 0);
  assert.match(s.toggle.textContent, /Activar/);
  s.click(s.toggle);
  assert.equal(timer.count, 1);
  carousel.destroy();
  assert.equal(timer.count, 0);
  assert.equal(docListeners.size, 0);
  assert.equal(pageListeners.size, 0);
  assert.equal(observation.closed, true);
});
