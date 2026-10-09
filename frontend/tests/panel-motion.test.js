import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPanelMotion,PANEL_SELECTOR} from '../public/panel-motion.js';

function fixture(){
 const listeners=new Map(),animations=[],doc={hidden:false,selection:{isCollapsed:true},getSelection(){return this.selection;},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const panel={isConnected:true,paused:false,dragging:false,closest:()=>panel.paused?{}:null,matches:()=>panel.dragging,animate(frames,options){let resolve;const animation={frames,options,cancelled:false,finished:new Promise(done=>{resolve=done;}),cancel(){this.cancelled=true;resolve();},finish:()=>resolve()};animations.push(animation);return animation;}};
 const target={editing:false,closest:selector=>selector===PANEL_SELECTOR?panel:target.editing?{}:null};
 let reduced=false;
 const controller=bindPanelMotion(doc,{reduced:()=>reduced});
 const click=()=>listeners.get('click')({target});
 return {doc,panel,target,listeners,animations,controller,click,setReduced(value){reduced=value;}};
}
test('clic, toque y activación por teclado animan solo la tarjeta más cercana sin interceptar la acción',async()=>{
 const f=fixture();f.click();assert.equal(f.animations.length,1);const first=f.animations[0];assert.equal(first.options.composite,'add');assert.ok(first.options.duration>=200&&first.options.duration<=500);
 f.click();assert.equal(first.cancelled,true);assert.equal(f.animations.length,2);f.animations[1].finish();await new Promise(resolve=>setImmediate(resolve));
 f.controller.reset();assert.equal(f.animations[1].cancelled,false);f.controller.destroy();assert.equal(f.listeners.size,0);
});
test('seleccionar texto, editar campos o arrastrar una tarjeta no dispara movimiento de clic',()=>{
 const f=fixture();f.doc.selection.isCollapsed=false;f.click();f.doc.selection.isCollapsed=true;f.target.editing=true;f.click();f.target.editing=false;f.panel.dragging=true;f.click();f.panel.dragging=false;f.panel.isConnected=false;f.click();assert.equal(f.animations.length,0);f.controller.destroy();
});
test('pausa, movimiento reducido, pestaña oculta y cambio de pantalla cancelan las animaciones pendientes',()=>{
 const f=fixture();f.panel.paused=true;f.click();f.panel.paused=false;f.setReduced(true);f.click();f.setReduced(false);f.doc.hidden=true;f.click();f.doc.hidden=false;assert.equal(f.animations.length,0);
 f.click();f.listeners.get('ensambla-motion')({detail:{paused:true}});assert.equal(f.animations[0].cancelled,true);
 f.click();f.doc.hidden=true;f.listeners.get('visibilitychange')();assert.equal(f.animations[1].cancelled,true);f.doc.hidden=false;
 f.click();f.listeners.get('dragstart')();assert.equal(f.animations[2].cancelled,true);
 f.click();f.controller.reset();assert.equal(f.animations[3].cancelled,true);f.controller.destroy();
});
