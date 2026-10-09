/** Respuesta al interactuar con tarjetas. Evita animar durante selección de texto, edición o arrastres. */
import { EASE, reducedMotion } from './motion.js';

// Individual surfaces respond without moving their surrounding layout.
export const PANEL_SELECTOR = [
  '.application-card',
  '.new-application-card',
  '.welcome-banner',
  '.trial-card',
  '.admin-card',
  '.data-card',
  '.settings-card',
  '.integration-card',
  '.process-card',
  '.app-block',
  '.order-card',
  '.recipe-card',
  '.stat',
  '.inspector',
  '.rail-tip',
  '.identity-preview',
  '.offline-note',
  '.use-slide',
  '.plan',
  '.use-card',
  '.access-lab',
  '.access-result',
  '.access-principles>article',
  '.product-shot',
  '.shot-stats>div',
  '.shot-table',
  '.assembly-window',
  '.stage-block',
  '.tailored-bento>article',
  '.taxonomy-showcase',
  '.filter-showcase',
  '.parameter-showcase',
  '.case-app',
  '.world-photo',
  '.faqs>details',
  '.guide-steps>li',
  '.template-tile',
  '.catalog-grid>button',
  '.layout-presets>button',
  '.nav-brand-module',
  '.nav-piece',
  '.nav-cta-module',
  '.footer-create',
  '.footer-piece',
  '.start-option-list>button',
  '.block-palette>button',
].join(',');

export function bindPanelMotion(doc = globalThis.document, { reduced = reducedMotion } = {}) {
  const active = new Map();
  function stop() {
    for (const animation of active.values()) animation.cancel();
    active.clear();
  }
  function click(event) {
    const target = event.target;
    if (event.defaultPrevented || doc.hidden || reduced() || !target?.closest) return;
    // Keep text selection and input editing still, including a release outside.
    if (
      target.closest(
        'input,textarea,select,[contenteditable]:not([contenteditable="false"]),:disabled,[aria-disabled="true"],[inert]',
      )
    )
      return;
    const selection = doc.getSelection?.();
    if (selection && !selection.isCollapsed) return;
    const panel = target.closest(PANEL_SELECTOR);
    if (
      !panel?.isConnected ||
      !panel.animate ||
      panel.closest('[data-motion-paused="true"]') ||
      panel.matches('.dragging,[aria-grabbed="true"]')
    )
      return;
    active.get(panel)?.cancel();
    try {
      // The brief nudge settles gently, preserving hover and artwork rotation.
      const animation = panel.animate(
        [{ translate: '0 0' }, { translate: '0 -2px', offset: 0.35 }, { translate: '0 0' }],
        { duration: 320, easing: EASE, composite: 'add' },
      );
      active.set(panel, animation);
      Promise.resolve(animation.finished)
        .catch(() => {})
        .finally(() => {
          if (active.get(panel) === animation) active.delete(panel);
        });
    } catch {
      active.delete(panel);
    }
  }
  const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  function quiet() {
    if (reduced() || doc.hidden) stop();
  }
  function pause(event) {
    if (event.detail?.paused) stop();
  }
  doc.addEventListener('click', click, true);
  doc.addEventListener('visibilitychange', quiet);
  doc.addEventListener('ensambla-motion', pause, true);
  doc.addEventListener('dragstart', stop, true);
  preference?.addEventListener?.('change', quiet);
  return {
    reset: stop,
    destroy() {
      stop();
      doc.removeEventListener('click', click, true);
      doc.removeEventListener('visibilitychange', quiet);
      doc.removeEventListener('ensambla-motion', pause, true);
      doc.removeEventListener('dragstart', stop, true);
      preference?.removeEventListener?.('change', quiet);
    },
  };
}
