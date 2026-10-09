import test from 'node:test';
import assert from 'node:assert/strict';
import {candleApp,blankApp,simpleApp,planProduction,produceOrder,parseCSV,collectionFromCSV,inferType,validateRecord,clone} from '../public/domain.js';
test('calcula insumos y excluye el molde del costo por pedido',()=>{
 const a=candleApp(),o=a.collections[1].rows[0],p=planProduction(a,o);
 assert.equal(p.enough,true);assert.equal(p.lines.find(l=>l.id==='mat1').needed,360);
 assert.equal(p.lines.find(l=>l.id==='mat6').needed,1);assert.equal(p.lines.find(l=>l.id==='mat6').cost,0);
 assert.equal(p.totalCost,3*(120*9.5+40*6.8+8*45+.12*300+.8*150));
});
test('produce una sola vez y conserva recursos reutilizables',()=>{
 const a=candleApp();produceOrder(a,'ord1');
 assert.equal(a.collections[0].rows[0].qty,490);assert.equal(a.collections[0].rows[5].qty,4);
 assert.equal(a.collections[1].rows[0].status,'Terminado');assert.equal(a.activity.length,1);
 const after=clone(a);assert.throws(()=>produceOrder(a,'ord1'),/ya fue producido/);assert.deepEqual(a,after);
});
test('si falta un material no descuenta parcialmente ni cambia el pedido',()=>{
 const a=candleApp(),before=clone(a);assert.throws(()=>produceOrder(a,'ord2'),/stock no alcanza/);assert.deepEqual(a,before);
});
test('una receta con material faltante se detiene antes de mutar',()=>{
 const a=candleApp();a.recipes[0].ingredients.push({material:'gone',qty:3});const before=clone(a);assert.throws(()=>produceOrder(a,'ord1'),/ya no existe/);assert.deepEqual(a,before);
});
test('reúne ingredientes repetidos y evita descuentos negativos',()=>{
 const a=candleApp();a.recipes[0].ingredients.push({material:'mat1',qty:200});const p=planProduction(a,a.collections[1].rows[0]);assert.equal(p.lines.find(l=>l.id==='mat1').needed,960);assert.equal(p.enough,false);assert.throws(()=>produceOrder(a,'ord1'),/stock no alcanza/);
});
test('desactivar la regla registra producción sin descontar y sigue siendo idempotente',()=>{
 const a=candleApp();a.rules.deductStock=false;produceOrder(a,'ord1');assert.equal(a.collections[0].rows[0].qty,850);assert.equal(a.collections[1].rows[0].deducted,false);a.rules.deductStock=true;assert.throws(()=>produceOrder(a,'ord1'),/ya fue producido/);
});
test('cantidad entera positiva y stock de materiales no negativo',()=>{
 const a=candleApp();for(const qty of [0,-1,1.5,Infinity])assert.throws(()=>planProduction(a,{product:'recipe1',qty}));
 assert.throws(()=>validateRecord(a.collections[0],{name:'Cera',qty:-1,unit:'g'}),/Stock/);
 assert.throws(()=>validateRecord(a.collections[1],{customer:'Cliente',product:'recipe1',qty:2,date:'2026-10-08',status:'Terminado'}),/Producir pedido/);
});
test('CSV: encabezados, BOM, punto y coma, decimal argentino y comillas',()=>{
 const p=parseCSV('\uFEFFMaterial;Stock;Notas\r\n"Cera; soja";"12,5";"dijo ""hola"""\r\nPabilo;8;OK');assert.equal(p.separator,';');assert.equal(p.rows[0][0],'Cera; soja');assert.equal(p.rows[0][2],'dijo "hola"');
 const c=collectionFromCSV(p,'Materiales');assert.equal(c.fields[1].type,'number');assert.equal(c.rows[0].col1,12.5);
});
test('CSV: conserva saltos dentro de celdas y reconoce tabulaciones',()=>{
 const p=parseCSV('Nombre\tNota\nAna\t"Dos\nlíneas"\nJuan\tUna línea');assert.equal(p.rows[0][1],'Dos\nlíneas');assert.equal(p.separator,'\t');
});
test('CSV: rechaza encabezados repetidos, filas incompletas y comillas abiertas',()=>{
 for(const csv of ['A,A\n1,2','A,B\n1','A,B\n"1,2','A,B\n'])assert.throws(()=>parseCSV(csv));
 assert.throws(()=>collectionFromCSV(parseCSV('A,B\nabc,2'),'X',{0:'number'}),/no son números/);
});
test('modelos independientes y plantillas generales',()=>{
 const a=candleApp(),b=candleApp();a.collections[0].rows[0].qty=0;assert.equal(b.collections[0].rows[0].qty,850);assert.notEqual(a.id,b.id);
 assert.equal(blankApp().blocks.length,0);assert.equal(simpleApp('attendance').collections[0].fields[0].label,'Persona');assert.equal(inferType(['2026-10-08']),'date');
});
