import {taxonomyLabel} from './adapt-domain.js';
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=x=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(Number(x)||0);
export const money=x=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(x)||0);
const paths={
 arrow:'M4 12h16m-6-6 6 6-6 6',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M18 6 6 18',check:'m5 12 4 4L19 6',chevron:'m9 5 7 7-7 7',back:'m14 5-7 7 7 7',down:'m5 9 7 7 7-7',up:'m5 15 7-7 7 7',
 dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 box:'m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7.5 5 9 4',
 bag:'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2',layers:'m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6M2 19l10 6 10-6',
 blocks:'M3 3h8v8H3zM15 3h6v6h-6zM15 13h6v8h-6zM3 15h8v6H3z',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 user:'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 settings:'m9 3 1 3h4l1-3 3 2-1 3 2 3 3 1v4l-3 1-2 3 1 3-3 2-1-3h-4l-1 3-3-2 1-3-2-3-3-1v-4l3-1 2-3-1-3 3-2ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Zm8-2v4M18 3h4',
 flame:'M12 3c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 1-5 3-7 0 3 1 4 2 4 2-2 2-5 1-9Z',
 table:'M3 4h18v16H3V4Zm0 5h18M3 14h18M9 4v16',form:'M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h3',
 bolt:'m13 2-9 12h7l-1 8 10-13h-8l1-7Z',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
 search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 5 6 6',edit:'m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
 desktop:'M3 3h18v13H3V3Zm9 13v5m-5 0h10',mobile:'M7 2h10v20H7V2Zm4 17h2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 help:'M9 8a3 3 0 0 1 6 0c0 3-3 3-3 6m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 file:'M4 2h10l6 6v14H4V2Zm10 0v6h6M8 12h8m-8 4h8',upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',download:'M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6',
 menu:'M3 6h18M3 12h18M3 18h18',grip:'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',text:'M3 5h18M12 5v16m-4 0h8',
 cloud:'M6 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 1 1 0 8H6Z',offline:'M4 9a13 13 0 0 1 14-2M7 13a8 8 0 0 1 8-1m-5 5 2-1M2 2l20 20',shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-4 10 3 3 5-5',
 calculator:'M5 2h14v20H5V2Zm3 3h8v4H8V5Zm0 8h1m6 0h1m-8 4h1m6 0h1',calendar:'M3 5h18v16H3V5Zm4-3v6m10-6v6M3 11h18',copy:'M8 8h13v13H8V8ZM3 16V3h13',logout:'M9 3H3v18h6m5-14 5 5-5 5m-6-5h11',info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
};
export const icon=(name,size=20)=>`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.blocks}"/></svg>`;
export const brand=(small=false)=>`<span class="brand ${small?'small':''}"><img src="./assets/ensambla.svg" alt="" width="30" height="34"><span>Ensambla<span class="brand-dot">.</span></span></span>`;
export const button=(label,action,extra='',classes='btn')=>`<button class="${classes}" data-action="${action}" ${extra}>${label}</button>`;
export const pill=(text,type='neutral')=>`<span class="pill ${type}">${esc(text)}</span>`;
export function valueLabel(app,c,f,value){if(f.key==='product'&&c.id==='orders')return app.recipes.find(r=>r.id===value)?.name||value;if(f.type==='boolean')return value?'Sí':'No';if(f.type==='number')return value===''||value==null?'—':fmt(value);if(f.type==='date'&&value)return String(value).split('-').reverse().join('/');return taxonomyLabel(c,f.key,value)??'—';}
export function empty(title,copy,cta=''){return `<div class="empty"><span class="empty-icon">${icon('blocks',32)}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p>${cta}</div>`;}
