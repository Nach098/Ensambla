/** Borradores locales del constructor. Separa cada cuenta y espacio y conserva
 * la maqueta histórica sin importarla ni borrarla; no almacena sesiones ni tokens. */
import { seedState } from './domain.js';
const KEY = 'ensambla.demo.v1';
function storageKey(scope) {
  if (!scope) return KEY;
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(scope))
    throw new Error('El borrador necesita una cuenta y un espacio válidos.');
  return `ensambla.local.v1:${scope}`;
}
export function loadState(scope) {
  try {
    const s = JSON.parse(localStorage.getItem(storageKey(scope)));
    if (s?.version === 1 && Array.isArray(s.apps) && s.profile && Array.isArray(s.members))
      return s;
  } catch {}
  const state = seedState();
  if (scope) state.members = [];
  return state;
}
export function persist(state, scope) {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(state));
    return true;
  } catch {
    globalThis.dispatchEvent?.(new CustomEvent('ensambla-storage-error'));
    return false;
  }
}
export function resetState(scope) {
  const s = seedState();
  if (scope) s.members = [];
  persist(s, scope);
  return s;
}
