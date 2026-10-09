import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,clone} from '../dist/domain.js';
import {applyLayoutPreset,restoreLayout} from '../dist/layout-play.js';

test('una distribución afecta solo el ancho de la pantalla de PC elegida',()=>{
  const app=seedState().apps[0],before=clone(app);
  applyLayoutPreset(app,'home','compact');
  assert.deepEqual(app.collections,before.collections);
  assert.deepEqual(app.blocks,before.blocks);
  assert.deepEqual(app.layouts.mobile,before.layouts.mobile);
  for(const b of app.blocks){
    if(b.screen==='home'){assert.equal(app.layouts.desktop[b.id].span,1);assert.equal(app.layouts.desktop[b.id].order,before.layouts.desktop[b.id]?.order);}
    else assert.deepEqual(app.layouts.desktop[b.id],before.layouts.desktop[b.id]);
  }
});
test('volver al diseño restaura anchos y entradas ausentes sin revivir bloques quitados',()=>{
  const app=seedState().apps[0],first=app.blocks.find(b=>b.screen==='home');
  delete app.layouts.desktop[first.id];const before=clone(app.layouts.desktop);
  const snapshot=applyLayoutPreset(app,'home','balanced');
  applyLayoutPreset(app,'home','focus');restoreLayout(app,snapshot);
  assert.deepEqual(app.layouts.desktop,before);
  app.blocks=app.blocks.filter(b=>b.id!==first.id);restoreLayout(app,snapshot);
  assert.ok(!app.blocks.some(b=>b.id===first.id));
});
test('un diseño no puede aplicarse a otra aplicación y se rechazan presets desconocidos',()=>{
  const app=seedState().apps[0],before=clone(app);
  assert.throws(()=>applyLayoutPreset(app,'home','unknown'));
  assert.deepEqual(app,before);
  const snapshot=applyLayoutPreset(app,'home','focus');
  assert.throws(()=>restoreLayout({...app,id:'other-app'},snapshot));
});
