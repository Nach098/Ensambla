import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAmbientZones} from '../dist/ambient.js';

function fixture(){const zones=[{dataset:{}},{dataset:{}}],page={querySelectorAll:()=>zones};return {zones,page};}
test('los adornos de una sección se activan al entrar, se pausan al salir y liberan su observador',()=>{
 const f=fixture();let observer;
 class Observer{constructor(callback,options){this.callback=callback;this.options=options;this.observed=[];observer=this;}observe(zone){this.observed.push(zone);}disconnect(){this.closed=true;}}
 const clear=bindAmbientZones(f.page,{Observer,reduced:()=>false});assert.equal(observer.observed.length,2);assert.equal(f.zones.every(z=>z.dataset.ambientActive==='false'),true);
 observer.callback([{target:f.zones[0],isIntersecting:true},{target:f.zones[1],isIntersecting:false}]);assert.equal(f.zones[0].dataset.ambientActive,'true');assert.equal(f.zones[1].dataset.ambientActive,'false');
 observer.callback([{target:f.zones[0],isIntersecting:false}]);assert.equal(f.zones[0].dataset.ambientActive,'false');clear();assert.equal(observer.closed,true);
 observer.callback([{target:f.zones[0],isIntersecting:false}]);assert.equal(f.zones[0].dataset.ambientActive,'true');
});
test('sin observación o con movimiento reducido, las secciones siguen disponibles',()=>{
 const first=fixture();const clear=bindAmbientZones(first.page,{Observer:null,reduced:()=>false});assert.equal(first.zones.every(z=>z.dataset.ambientActive==='true'),true);clear();
 const second=fixture();class Observer{constructor(){assert.fail('No debe observar con movimiento reducido');}}
 bindAmbientZones(second.page,{Observer,reduced:()=>true})();assert.equal(second.zones.every(z=>z.dataset.ambientActive==='true'),true);
});
test('si falla la observación, se conserva la sección y se libera el observador parcial',()=>{
 const f=fixture();let disconnected=false;class Observer{observe(){throw new Error('Observación no disponible');}disconnect(){disconnected=true;}}
 const clear=bindAmbientZones(f.page,{Observer,reduced:()=>false});assert.equal(disconnected,true);assert.equal(f.zones.every(z=>z.dataset.ambientActive==='true'),true);clear();
});
