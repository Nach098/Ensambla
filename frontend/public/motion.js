/** Transiciones de pantallas y diálogos. Coordina cambios suaves y respeta el movimiento reducido. */
export const EASE = 'cubic-bezier(.22,.75,.25,1)';
export const reducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

function play(element, frames, options) {
  if (!element?.animate) return null;
  try {
    const animation = element.animate(frames, { easing: EASE, ...options });
    animation.finished.catch(() => {});
    return animation;
  } catch {
    return null;
  }
}

// Each swap commits exactly once. Rapid changes replace a pending fallback;
// skipped native transitions still commit their DOM update normally.
export function createRenderer(
  container,
  {
    doc = globalThis.document,
    reduced = reducedMotion,
    native = true,
    pieceSelector = '.app-block[data-block]',
    pieceKey = (el) => el.dataset.block,
  } = {},
) {
  let current = null,
    exit = null,
    generation = 0;
  const panel = (region) =>
    container.querySelector?.(
      region || '.builder-subpage,.design-main,.runtime-content,.workspace-main',
    ) || container;
  return function swap(update, { animate = true, region = null, reorder = false } = {}) {
    const ticket = ++generation;
    exit?.cancel();
    exit = null;
    current?.skipTransition?.();
    if (!animate || reduced() || doc?.hidden || !container.firstElementChild) {
      update();
      return Promise.resolve();
    }
    let committed = false;
    const commit = () => {
      if (!committed) {
        committed = true;
        update();
      }
    };
    if (native && typeof doc?.startViewTransition === 'function') {
      try {
        const transition = doc.startViewTransition(commit);
        current = transition;
        transition.ready?.catch(() => {});
        transition.updateCallbackDone?.catch(() => {
          if (ticket === generation) commit();
        });
        return transition.finished
          .catch(() => {})
          .finally(() => {
            if (current === transition) current = null;
          });
      } catch {
        commit();
        return Promise.resolve();
      }
    }
    if (reorder) {
      const old = new Map(
        [...container.querySelectorAll(pieceSelector)].map((el) => [
          pieceKey(el),
          el.getBoundingClientRect(),
        ]),
      );
      commit();
      const animations = [...container.querySelectorAll(pieceSelector)].map((el) => {
        const before = old.get(pieceKey(el)),
          after = el.getBoundingClientRect();
        if (!before)
          return play(
            el,
            [
              { opacity: 0, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 260 },
          );
        const x = before.left - after.left,
          y = before.top - after.top;
        const sx = before.width > 0 && after.width > 0 ? before.width / after.width : 1;
        const sy = before.height > 0 && after.height > 0 ? before.height / after.height : 1;
        if (sx !== 1 || sy !== 1)
          return play(
            el,
            [
              {
                transformOrigin: 'top left',
                transform: `translate(${x}px,${y}px) scale(${sx},${sy})`,
              },
              { transformOrigin: 'top left', transform: 'translate(0,0) scale(1,1)' },
            ],
            { duration: 320 },
          );
        return x || y
          ? play(el, [{ transform: `translate(${x}px,${y}px)` }, { transform: 'translate(0,0)' }], {
              duration: 320,
            })
          : null;
      });
      return Promise.all(animations.filter(Boolean).map((a) => a.finished.catch(() => {})));
    }
    const oldPanel = panel(region);
    exit = play(
      oldPanel,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-5px)' },
      ],
      { duration: 120, fill: 'forwards' },
    );
    const done = exit?.finished.catch(() => {}) || Promise.resolve();
    return done.then(() => {
      if (ticket !== generation) return;
      exit?.cancel();
      exit = null;
      commit();
      const enter = play(
        panel(region),
        [
          { opacity: 0, transform: 'translateY(7px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 300 },
      );
      return enter?.finished.catch(() => {});
    });
  };
}

export function createDialogMotion(dialog, { reduced = reducedMotion } = {}) {
  let generation = 0,
    animation = null;
  function enter(content) {
    play(
      content,
      [
        { opacity: 0, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 300 },
    );
  }
  function focus() {
    dialog
      .querySelector('input:not([type="checkbox"]),select,textarea,button:not(.modal-close)')
      ?.focus({ preventScroll: true });
  }
  return {
    open(html, wide) {
      const ticket = ++generation;
      animation?.cancel();
      animation = null;
      const update = () => {
        const previousHeight = dialog.open ? dialog.getBoundingClientRect().height : 0;
        const wasOpen = dialog.open;
        dialog.className = wide ? 'wide-modal' : '';
        dialog.inert = false;
        dialog.innerHTML = html;
        if (!wasOpen) dialog.showModal();
        focus();
        if (reduced()) return;
        if (!wasOpen) {
          animation = play(
            dialog,
            [
              { opacity: 0, transform: 'translateY(15px) scale(.985)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            { duration: 260 },
          );
        } else {
          const nextHeight = dialog.getBoundingClientRect().height;
          play(dialog, [{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }], {
            duration: 240,
          });
          enter(dialog.querySelector('.dialog-content'));
        }
      };
      if (!dialog.open || reduced()) {
        update();
        return;
      }
      animation = play(
        dialog.querySelector('.dialog-content'),
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-5px)' },
        ],
        { duration: 120, fill: 'forwards' },
      );
      (animation?.finished.catch(() => {}) || Promise.resolve()).then(() => {
        if (ticket !== generation) return;
        animation?.cancel();
        animation = null;
        update();
      });
    },
    close(after = () => {}) {
      if (!dialog.open) return;
      dialog.inert = true;
      const ticket = ++generation;
      animation?.cancel();
      const close = () => {
        if (ticket !== generation) return;
        animation?.cancel();
        animation = null;
        if (dialog.open) dialog.close();
        after();
      };
      if (reduced()) {
        close();
        return;
      }
      animation = play(
        dialog,
        [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(9px) scale(.99)' },
        ],
        { duration: 150, fill: 'forwards' },
      );
      (animation?.finished.catch(() => {}) || Promise.resolve()).then(close);
    },
  };
}

export function dismiss(element) {
  const remove = () => element.remove();
  if (reducedMotion()) {
    remove();
    return;
  }
  const animation = play(
    element,
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(7px)' },
    ],
    { duration: 180, fill: 'forwards' },
  );
  (animation?.finished.catch(() => {}) || Promise.resolve()).then(remove);
}

const accordions = new WeakMap();
export function toggleDetails(details) {
  const previous = accordions.get(details),
    open = previous ? !previous.open : !details.open;
  const before = details.getBoundingClientRect().height;
  previous?.animation?.cancel();
  details.open = open;
  if (reducedMotion()) {
    accordions.delete(details);
    return;
  }
  const after = details.getBoundingClientRect().height;
  if (!open) details.open = true;
  const animation = play(details, [{ height: `${before}px` }, { height: `${after}px` }], {
    duration: 260,
  });
  const task = { animation, open };
  accordions.set(details, task);
  (animation?.finished.catch(() => {}) || Promise.resolve()).then(() => {
    if (accordions.get(details) !== task) return;
    details.open = open;
    accordions.delete(details);
  });
}
