/** Movimiento de fondos por visibilidad. Pausa adornos fuera de pantalla y libera sus observadores. */
import { reducedMotion } from './motion.js';

// CSS handles the movement. The observer only pauses sections outside the view.
export function bindAmbientZones(
  page,
  { Observer = globalThis.IntersectionObserver, reduced = reducedMotion } = {},
) {
  const zones = [...page.querySelectorAll('[data-ambient-zone]')];
  let observer = null,
    destroyed = false;
  const ready = () =>
    zones.forEach((zone) => {
      zone.dataset.ambientActive = 'true';
    });
  ready();
  if (Observer && !reduced()) {
    try {
      observer = new Observer(
        (entries) => {
          if (!destroyed)
            entries.forEach((entry) => {
              entry.target.dataset.ambientActive = String(entry.isIntersecting);
            });
        },
        { rootMargin: '120px 0px', threshold: 0 },
      );
      zones.forEach((zone) => {
        zone.dataset.ambientActive = 'false';
        observer.observe(zone);
      });
    } catch {
      observer?.disconnect();
      observer = null;
      ready();
    }
  }
  return () => {
    destroyed = true;
    observer?.disconnect();
    ready();
  };
}
