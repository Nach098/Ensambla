/** Interacciones de la landing: ideas, piezas y cálculos. Mantiene esas experiencias independientes del estado de las cuentas. */
import { esc, icon } from './ui.js';
import { createRenderer, reducedMotion, EASE } from './motion.js';
import { calculateBlock } from './adapt-domain.js';
import { resultMarkup, animateResult, cancelResult, showResultError } from './result-motion.js';
import { bindAmbientZones } from './ambient.js';

export const heroIdeas = [
  {
    id: 'inventory',
    label: 'Inventario',
    symbol: 'box',
    kind: 'blank',
    tone: 'mint',
    name: 'Mi comercio',
    title: 'Todo en su lugar.',
    copy: 'Tus productos, tus categorías y una vista para encontrarlos.',
    stats: [
      ['Productos', '3'],
      ['Categorías', '2'],
    ],
    headers: ['Producto', 'Disponible'],
    rows: [
      ['Libreta A5', '24 u'],
      ['Cuaderno artesanal', '16 u'],
      ['Taza de cerámica', '12 u'],
    ],
    note: 'Elegí las columnas y filtrá por categoría.',
    cta: 'Crear mi inventario',
  },
  {
    id: 'team',
    label: 'Equipo',
    symbol: 'users',
    kind: 'attendance',
    tone: 'blue',
    name: 'Mi equipo',
    title: 'Cada persona cuenta.',
    copy: 'Un registro para consultar quién está y cómo se organiza el equipo.',
    stats: [
      ['Personas', '3'],
      ['Presentes', '2'],
    ],
    headers: ['Persona', 'Estado'],
    rows: [
      ['Alex', 'Presente'],
      ['Sol', 'Presente'],
      ['Dani', 'Tarde'],
    ],
    note: 'Dale tus propios nombres a las áreas y los equipos.',
    cta: 'Crear mi registro',
  },
  {
    id: 'projects',
    label: 'Proyectos',
    symbol: 'check',
    kind: 'tasks',
    tone: 'violet',
    name: 'Mi proyecto',
    title: 'Del pendiente al hecho.',
    copy: 'Tus tareas, sus fechas y el estado de cada una.',
    stats: [
      ['Tareas', '3'],
      ['Finalizadas', '1'],
    ],
    headers: ['Tarea', 'Estado'],
    rows: [
      ['Preparar propuesta', 'Pendiente'],
      ['Revisar presupuesto', 'En curso'],
      ['Enviar entrega', 'Hecha'],
    ],
    note: 'Mostrá solo las tareas que necesitás en cada bloque.',
    cta: 'Organizar mis proyectos',
  },
  {
    id: 'calculator',
    label: 'Cálculos',
    symbol: 'calculator',
    kind: 'blank',
    tone: 'yellow',
    name: 'Mi herramienta',
    title: 'Tus cuentas, claras.',
    copy: 'Una calculadora con los datos y las unidades de tu trabajo.',
    stats: [
      ['Entradas', '2'],
      ['Operación', '×'],
    ],
    note: 'Cambiá los valores y probá el resultado.',
    cta: 'Crear mi herramienta',
  },
];
export function heroPreview(id = 'inventory') {
  const idea = heroIdeas.find((i) => i.id === id) || heroIdeas[0];
  const content = idea.rows
    ? `<div class="shot-table"><div class="shot-table-title"><strong>${esc(idea.label)}</strong><span>${idea.rows.length} registros</span></div><div class="shot-row table-head"><span>${esc(idea.headers[0])}</span><span>${esc(idea.headers[1])}</span></div>${idea.rows.map(([name, value], i) => `<div class="shot-row"><span><i class="material-dot dot-${i}"></i>${esc(name)}</span><strong class="preview-value ${['Presente', 'Hecha'].includes(value) ? 'is-done' : ''}">${esc(value)}</strong></div>`).join('')}</div>`
    : `<form class="hero-calculator" data-landing-calculator><div><label>Horas<input name="hours" type="number" min="0" step="any" value="2" required></label><span aria-hidden="true">×</span><label>Valor por hora ($)<input name="rate" type="number" min="0" step="any" value="6500" required></label></div><button type="submit">Calcular ${icon('arrow', 17)}</button><output aria-live="polite" aria-atomic="true">${resultMarkup(13000, { label: 'Estimación' })}</output></form>`;
  return `<aside class="shot-sidebar"><span class="shot-mark">${icon(idea.symbol, 23)}</span><span class="shot-nav on">${icon('dashboard', 18)}</span><span class="shot-nav">${icon('table', 18)}</span><span class="shot-nav">${icon('form', 18)}</span><span class="shot-nav">${icon('settings', 18)}</span><span class="shot-avatar">E</span></aside><div class="shot-content"><div class="shot-top"><span>${esc(idea.name.toUpperCase())}</span></div><h3>${esc(idea.title)}</h3><p>${esc(idea.copy)}</p><div class="shot-stats">${idea.stats.map(([label, value], i) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong>${icon(i ? 'layers' : idea.symbol, 20)}</div>`).join('')}</div>${content}<div class="hero-preview-note">${icon('spark', 16)} ${esc(idea.note)}</div><button class="hero-preview-use" data-action="choose-template" data-kind="${idea.kind}">${esc(idea.cta)} ${icon('arrow', 14)}</button></div>`;
}

export const stagePieces = [
  { id: 'table', label: 'Tabla', icon: 'table' },
  { id: 'form', label: 'Formulario', icon: 'form' },
  { id: 'metric', label: 'Indicador', icon: 'dashboard' },
  { id: 'calculator', label: 'Calculadora', icon: 'calculator' },
];
export function createPieceSelection(initial = ['table', 'form', 'metric']) {
  let selected = initial.filter(
    (id, i) => stagePieces.some((p) => p.id === id) && initial.indexOf(id) === i,
  );
  return {
    get selected() {
      return [...selected];
    },
    toggle(id) {
      if (!stagePieces.some((p) => p.id === id)) return this.selected;
      selected = selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id];
      return this.selected;
    },
    mix() {
      if (selected.length > 1) selected = [selected.at(-1), ...selected.slice(0, -1)];
      return this.selected;
    },
    reset() {
      selected = ['table', 'form', 'metric'];
      return this.selected;
    },
  };
}
// Even selections form pairs. An odd selection has one full-width piece.
export function arrangeStagePieces(ids) {
  const selected = [...new Set(ids)].filter((id) => stagePieces.some((p) => p.id === id));
  if (selected.length !== 3)
    return selected.map((id) => ({ id, span: selected.length === 1 ? 2 : 1 }));
  const wide = selected.find((id) => id === 'table' || id === 'calculator');
  const compact = selected.filter((id) => id !== wide);
  let paired = false;
  return selected.flatMap((id) => {
    if (id !== wide) {
      if (paired) return [];
      paired = true;
      return compact.map((id) => ({ id, span: 1 }));
    }
    return [{ id, span: 2 }];
  });
}
export function stagePreview(ids = ['table', 'form', 'metric']) {
  const pieces = arrangeStagePieces(ids);
  if (!pieces.length)
    return `<div class="stage-empty">${icon('blocks', 31)}<strong>Hay lugar para tu idea.</strong><span>Elegí una pieza para empezar.</span></div>`;
  const bodies = {
    table: `<div class="stage-table"><p>Tarea <span>Estado</span></p><p>Preparar propuesta <strong>Pendiente</strong></p><p>Revisar presupuesto <strong>En curso</strong></p><p>Enviar entrega <strong class="done">Hecha</strong></p></div>`,
    form: `<div class="stage-fields"><span>Nombre de la tarea</span><i>Mi próximo paso</i><span>Proyecto</span><i>Mi idea ${icon('down', 11)}</i><b>Agregar tarea ${icon('arrow', 12)}</b></div>`,
    metric: `<div class="stage-number"><strong>1 <small>de 3</small></strong><span>tarea finalizada en esta vista</span><i><b></b></i></div>`,
    calculator: `<div class="stage-math"><span>Horas <b>2</b></span><i>×</i><span>Valor / hora <b>$ 6.500</b></span><div>Estimación <strong>$ 13.000</strong></div></div>`,
  };
  return pieces
    .map(({ id, span }) => {
      const p = stagePieces.find((p) => p.id === id);
      return `<article class="stage-block stage-${id} stage-span-${span}" data-stage-block="${id}"><div class="stage-block-heading"><strong>${icon(p.icon, 16)} ${id === 'table' ? 'Mis tareas' : id === 'form' ? 'Nueva tarea' : id === 'metric' ? 'Mi avance' : 'Mi cálculo'}</strong><button type="button" data-toggle-piece="${id}" aria-label="Quitar ${p.label.toLowerCase()}">${icon('close', 13)}</button></div>${bodies[id]}</article>`;
    })
    .join('');
}

function previewRenderer(container, { reduced, pieces = false }) {
  const quiet = () => reduced() || !!container.closest?.('[data-motion-paused="true"]');
  const swap = createRenderer(container, {
    native: false,
    reduced: quiet,
    ...(pieces
      ? { pieceSelector: '.stage-block[data-stage-block]', pieceKey: (el) => el.dataset.stageBlock }
      : {}),
  });
  let resize = null;
  return {
    render(html) {
      return swap(
        () => {
          if (!container.isConnected) return;
          const before = container.offsetHeight ?? container.getBoundingClientRect?.().height;
          resize?.cancel();
          resize = null;
          container.innerHTML = html;
          const after = container.offsetHeight ?? container.getBoundingClientRect?.().height;
          if (
            !quiet() &&
            !container.ownerDocument?.hidden &&
            before &&
            after &&
            Math.abs(before - after) > 1 &&
            container.animate
          ) {
            try {
              resize = container.animate([{ height: `${before}px` }, { height: `${after}px` }], {
                duration: 340,
                easing: EASE,
              });
              resize.finished?.catch(() => {});
            } catch {
              resize = null;
            }
          }
        },
        { region: '.shot-content', reorder: pieces },
      );
    },
    destroy() {
      resize?.cancel();
      resize = null;
    },
  };
}

export function bindHeroIdeas(hero, { reduced = reducedMotion } = {}) {
  const preview = hero.querySelector('[data-hero-preview]'),
    tabs = [...hero.querySelectorAll('[data-hero-idea]')];
  const renderer = previewRenderer(preview, { reduced });
  let active = heroIdeas[0].id,
    resultOutput = null;
  function choose(id) {
    const idea = heroIdeas.find((i) => i.id === id);
    if (!idea || id === active) return;
    active = id;
    if (resultOutput) cancelResult(resultOutput);
    hero.dataset.ideaTone = idea.tone;
    preview.setAttribute('aria-labelledby', `idea-${id}`);
    tabs.forEach((tab) => {
      const selected = tab.dataset.heroIdea === id;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    renderer.render(heroPreview(id));
  }
  function click(event) {
    const tab = event.target.closest('[data-hero-idea]');
    if (tab && hero.contains(tab)) choose(tab.dataset.heroIdea);
  }
  function key(event) {
    const index = tabs.indexOf(event.target);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    choose(tabs[to].dataset.heroIdea);
    tabs[to].focus({ preventScroll: true });
  }
  function calculate(event) {
    const form = event.target.closest('[data-landing-calculator]');
    if (!form) return;
    event.preventDefault();
    resultOutput = form.querySelector('output');
    try {
      const value = calculateBlock(
        { operation: 'multiply' },
        form.elements.hours.value,
        form.elements.rate.value,
      );
      animateResult(resultOutput, value, { label: 'Estimación', reduced });
    } catch {
      showResultError(resultOutput, 'Completá ambos valores con números válidos.', { reduced });
    }
  }
  hero.addEventListener('click', click);
  hero.addEventListener('keydown', key);
  hero.addEventListener('submit', calculate);
  return {
    choose,
    get active() {
      return active;
    },
    destroy() {
      if (resultOutput) cancelResult(resultOutput);
      renderer.destroy();
      hero.removeEventListener('click', click);
      hero.removeEventListener('keydown', key);
      hero.removeEventListener('submit', calculate);
    },
  };
}

export function bindPieceStage(stage, { reduced = reducedMotion } = {}) {
  const grid = stage.querySelector('[data-stage-grid]'),
    controls = [...stage.querySelectorAll('.stage-controls [data-toggle-piece]')],
    mix = stage.querySelector('[data-stage-mix]'),
    status = stage.querySelector('[data-stage-status]');
  const selection = createPieceSelection(),
    renderer = previewRenderer(grid, { reduced, pieces: true });
  function update() {
    const ids = selection.selected;
    controls.forEach((button) => {
      const selected = ids.includes(button.dataset.togglePiece);
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('active', selected);
    });
    mix.disabled = ids.length < 2;
    status.textContent = ids.length
      ? `${ids.length} piezas: ${arrangeStagePieces(ids)
          .map(({ id }) => stagePieces.find((p) => p.id === id).label)
          .join(', ')}.`
      : 'Elegí tu primera pieza.';
    renderer.render(stagePreview(ids));
  }
  function click(event) {
    const button = event.target.closest('[data-toggle-piece],[data-stage-mix],[data-stage-reset]');
    if (!button || !stage.contains(button) || button.disabled) return;
    if (button.hasAttribute('data-toggle-piece')) {
      selection.toggle(button.dataset.togglePiece);
      if (grid.contains?.(button))
        controls
          .find((control) => control.dataset.togglePiece === button.dataset.togglePiece)
          ?.focus({ preventScroll: true });
    } else if (button.hasAttribute('data-stage-mix')) selection.mix();
    else selection.reset();
    update();
  }
  stage.addEventListener('click', click);
  return {
    selection,
    destroy() {
      renderer.destroy();
      stage.removeEventListener('click', click);
    },
  };
}

let sessionPaused = false;
export function bindLanding(
  root,
  {
    reduced = reducedMotion,
    doc = globalThis.document,
    Observer = globalThis.IntersectionObserver,
  } = {},
) {
  const page = root.querySelector('.landing');
  if (!page) return () => {};
  const hero = page.querySelector('[data-hero-play]'),
    stage = page.querySelector('[data-piece-stage]');
  const controllers = [
    hero && bindHeroIdeas(hero, { reduced }),
    stage && bindPieceStage(stage, { reduced }),
  ].filter(Boolean);
  const clearAmbient = bindAmbientZones(page, { Observer, reduced });
  const toggle = page.querySelector('[data-motion-toggle]');
  function motion() {
    const paused = sessionPaused || reduced() || doc.hidden;
    page.dataset.motionPaused = String(paused);
    if (paused) page.dataset.introComplete = 'true';
    toggle?.setAttribute('aria-pressed', String(sessionPaused || reduced()));
    if (toggle) {
      toggle.disabled = reduced();
      toggle.textContent = reduced()
        ? 'Movimiento reducido'
        : sessionPaused
          ? 'Activar movimiento'
          : 'Pausar movimiento';
    }
    page.dispatchEvent(new CustomEvent('ensambla-motion', { detail: { paused } }));
  }
  function click(event) {
    if (event.target.closest('[data-motion-toggle]')) {
      sessionPaused = !sessionPaused;
      motion();
    }
  }
  const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  page.addEventListener('click', click);
  doc.addEventListener('visibilitychange', motion);
  preference?.addEventListener?.('change', motion);
  motion();
  const reveals = [...page.querySelectorAll('[data-reveal]')];
  let observer;
  if (!reduced() && Observer) {
    observer = new Observer(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    reveals.forEach((el, i) => {
      if (el.getBoundingClientRect().top > globalThis.innerHeight) {
        el.style.setProperty('--reveal-delay', `${(i % 3) * 85}ms`);
        el.classList.add('reveal-ready');
        observer.observe(el);
      }
    });
  }
  function focus(event) {
    const el = event.target.closest('[data-reveal]');
    if (el) {
      el.style.setProperty('--reveal-delay', '0ms');
      el.classList.add('is-visible');
      observer?.unobserve(el);
    }
  }
  page.addEventListener('focusin', focus);
  let frame = null;
  function pointer(event) {
    if (reduced() || page.dataset.motionPaused === 'true' || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect(),
      x = Math.max(-5, Math.min(5, (event.clientX - rect.left - rect.width / 2) / 45)),
      y = Math.max(-5, Math.min(5, (event.clientY - rect.top - rect.height / 2) / 45));
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      hero.style.setProperty('--pointer-x', `${x}px`);
      hero.style.setProperty('--pointer-y', `${y}px`);
      frame = null;
    });
  }
  function leave() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    hero.style.setProperty('--pointer-x', '0px');
    hero.style.setProperty('--pointer-y', '0px');
  }
  hero?.addEventListener('pointermove', pointer, { passive: true });
  hero?.addEventListener('pointerleave', leave);
  return () => {
    controllers.forEach((c) => c.destroy());
    clearAmbient();
    observer?.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
    hero?.removeEventListener('pointermove', pointer);
    hero?.removeEventListener('pointerleave', leave);
    page.removeEventListener('click', click);
    page.removeEventListener('focusin', focus);
    doc.removeEventListener('visibilitychange', motion);
    preference?.removeEventListener?.('change', motion);
  };
}
