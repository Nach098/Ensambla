import {seedState} from './domain.js';
const KEY='ensambla.demo.v1';
export function loadState(){
  try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===1&&Array.isArray(s.apps)&&s.profile&&Array.isArray(s.members))return s;}catch{}
  return seedState();
}
export function persist(state){
  try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{globalThis.dispatchEvent?.(new CustomEvent('ensambla-storage-error'));return false;}
}
export function resetState(){const s=seedState();persist(s);return s;}
