import test from 'node:test';
import assert from 'node:assert/strict';
import {candleApp,blankApp,field,clone,validateRecord} from '../public/domain.js';
import {configureTaxonomy,configureAppTaxonomy,validateTaxonomy,taxonomyOptions,taxonomyLabel,queryRows,validateFilters,metricValue,calculateBlock,updateQuickFilter} from '../public/adapt-domain.js';
import {loadState} from '../public/store.js';

test('la plantilla clasifica materiales sin cambiar el stock ni sus identificadores',()=>{
 const c=candleApp().collections[0],t=c.taxonomy;validateTaxonomy(c);
 assert.deepEqual(queryRows(c,{filters:[{field:t.subcategoryKey,op:'eq',value:'wax'}]}).map(r=>r.id),['mat1','mat2']);
 assert.equal(c.rows[5][t.categoryKey],'tools');assert.equal(c.rows[5].qty,4);
});
test('renombrar niveles y categorías conserva claves, registros y condiciones guardadas',()=>{
 const a=candleApp(),c=a.collections[0],t=clone(c.taxonomy),rows=clone(c.rows);
 a.blocks[3].filters=[{field:t.categoryKey,op:'eq',value:'supplies'}];t.groups[0].name='Consumibles';
 configureAppTaxonomy(a,c.id,{...t,categoryLabel:'Clase',subcategoryLabel:'Variedad'});
 assert.equal(c.taxonomy.categoryKey,t.categoryKey);assert.deepEqual(c.rows,rows);
 assert.equal(taxonomyLabel(c,t.categoryKey,'supplies'),'Consumibles');assert.equal(queryRows(c,{filters:a.blocks[3].filters}).length,5);
});
test('no elimina ni cambia de padre opciones que todavía tienen registros; el cambio es atómico',()=>{
 const c=candleApp().collections[0],before=clone(c),t=clone(c.taxonomy);
 t.groups[0].children=t.groups[0].children.filter(s=>s.id!=='wax');assert.throws(()=>configureTaxonomy(c,t),/pertenecer/);assert.deepEqual(c,before);
 const moved=clone(c.taxonomy),wax=moved.groups[0].children.shift();moved.groups[1].children.push(wax);
 assert.throws(()=>configureTaxonomy(c,moved),/pertenecer/);assert.deepEqual(c,before);
});
test('no elimina una opción usada solo por un filtro guardado',()=>{
 const a=candleApp(),c=a.collections[0],t=clone(c.taxonomy);t.groups[0].children.push({id:'spare',name:'Otros'});configureTaxonomy(c,t);
 a.blocks[3].filters=[{field:t.subcategoryKey,op:'eq',value:'spare'}];const before=clone(c);
 t.groups[0].children.pop();assert.throws(()=>configureAppTaxonomy(a,c.id,t),/opción disponible/);assert.deepEqual(c,before);
 a.blocks[3].filters=[];configureAppTaxonomy(a,c.id,t);assert.equal(c.fields.find(f=>f.key===t.subcategoryKey).options.includes('spare'),false);
});
test('rechaza nombres duplicados, niveles iguales y claves inválidas antes de modificar',()=>{
 const c={id:'custom',fields:[field('name','Nombre')],rows:[]},before=clone(c);
 for(const config of [
  {categoryLabel:'Área',subcategoryLabel:'area',groups:[{id:'g',name:'Equipo',children:[]}]},
  {categoryLabel:'Área',subcategoryLabel:'Equipo',groups:[{id:'g',name:'Área',children:[]},{id:'h',name:'area',children:[]}]},
  {categoryLabel:'Área',subcategoryLabel:'Equipo',groups:[{id:'g',name:'Equipo',children:[{id:'g',name:'Uno'}]}]},
 ]){assert.throws(()=>configureTaxonomy(c,config));assert.deepEqual(c,before);}
});
test('una subcategoría depende de su categoría en opciones y al guardar un registro',()=>{
 const c=candleApp().collections[0],t=c.taxonomy,f=c.fields.find(f=>f.key===t.subcategoryKey);
 assert.deepEqual(taxonomyOptions(c,f,'tools').map(o=>o.value),['mold']);assert.deepEqual(taxonomyOptions(c,f,'__none__'),[]);
 assert.throws(()=>validateRecord(c,{...c.rows[0],[t.categoryKey]:'tools',[t.subcategoryKey]:'wax'}),/pertenecer/);
 assert.throws(()=>validateRecord(c,{...c.rows[0],[t.categoryKey]:'',[t.subcategoryKey]:'wax'}),/pertenecer/);
 assert.doesNotThrow(()=>validateRecord(c,{...c.rows[0],[t.categoryKey]:'',[t.subcategoryKey]:''}));
});
test('combina filtros numéricos, fechas, estados y booleanos sin cambiar datos',()=>{
 const c={id:'table',fields:[field('name','Nombre'),field('qty','Cantidad','number'),field('date','Fecha','date'),field('active','Activo','boolean'),field('status','Estado','select',false,['Pendiente','Hecho'])],rows:[{id:'a',name:'Pedido A',qty:10,date:'2026-10-09',active:true,status:'Pendiente'},{id:'b',name:'Pedido B',qty:20,date:'2026-10-10',active:false,status:'Hecho'},{id:'c',name:'Pedido C',qty:30,date:'2026-10-11',active:true,status:'Pendiente'}]},before=clone(c);
 const filters=[{field:'qty',op:'gte',value:'20'},{field:'date',op:'lt',value:'2026-10-12'},{field:'active',op:'eq',value:'true'},{field:'status',op:'neq',value:'Hecho'}];
 assert.deepEqual(queryRows(c,{search:'pedido',filters}).map(r=>r.id),['c']);assert.deepEqual(c,before);
 assert.deepEqual(queryRows(c,{filters:[{field:'qty',op:'eq',value:'10'}]}).map(r=>r.id),['a']);
});
test('busca por etiquetas de categorías y acepta acentos indistintamente',()=>{
 const c=candleApp().collections[0];assert.equal(queryRows(c,{search:'esencias'})[0].id,'mat3');assert.equal(queryRows(c,{search:'PARAFÍNA'})[0].id,'mat2');
});
test('cambiar un filtro de categoría limpia su subcategoría y conserva condiciones independientes',()=>{
 const c=candleApp().collections[0],t=c.taxonomy,q={search:'',filters:[{field:t.categoryKey,op:'eq',value:'supplies'},{field:t.subcategoryKey,op:'eq',value:'wax'},{field:'qty',op:'gt',value:'1'}]};
 updateQuickFilter(c,q,t.categoryKey,'tools');assert.equal(q.filters.some(r=>r.field===t.subcategoryKey),false);assert.equal(q.filters.some(r=>r.field==='qty'),true);assert.equal(queryRows(c,q)[0].id,'mat6');
});
test('valida el tipo del filtro, fechas reales y opciones de la tabla',()=>{
 const c=candleApp().collections[1];
 for(const rule of [{field:'date',op:'eq',value:'2026-02-30'},{field:'date',op:'eq',value:'2026-13-02'},{field:'qty',op:'gte',value:'abc'},{field:'status',op:'eq',value:'Otro'},{field:'qty',op:'contains',value:'2'},null])assert.throws(()=>validateFilters(c,[rule]));
 assert.throws(()=>validateFilters(c,Array(13).fill({field:'qty',op:'gt',value:'1'})),/12/);
});
test('los indicadores calculan la misma vista filtrada y omiten valores numéricos vacíos',()=>{
 const c=candleApp().collections[0],q={filters:[{field:c.taxonomy.subcategoryKey,op:'eq',value:'wax'}]};
 assert.deepEqual(metricValue(c,{kind:'count'},q),{value:2,count:2});
 for(const [kind,value] of [['sum',2650],['average',1325],['min',850],['max',1800]])assert.equal(metricValue(c,{kind,field:'qty'},q).value,value);
 c.rows[0].qty='';assert.equal(metricValue(c,{kind:'average',field:'qty'},q).value,1800);assert.throws(()=>metricValue(c,{kind:'sum',field:'name'}),/numérico/);
 assert.equal(metricValue(c,{kind:'sum',field:'qty'},{search:'sin coincidencias'}).value,0);
});
test('las calculadoras cambian operación y rechazan división por cero, faltantes y desbordes',()=>{
 for(const [operation,value] of [['multiply',30],['add',13],['subtract',7],['divide',10/3]])assert.equal(calculateBlock({operation},10,3),value);
 for(const [b,a,n] of [[{operation:'divide'},1,0],[{},'',2],[{},null,2],[{},Infinity,2],[{},1e308,1e308],[{operation:'eval'},1,2]])assert.throws(()=>calculateBlock(b,a,n));
});
test('mantiene aplicaciones de versiones anteriores sin resetear ni clasificarlas automáticamente',()=>{
 const old={version:1,profile:{name:'Usuario'},members:[],apps:[blankApp('Mi trabajo')],trialStart:'2026-01-01'};old.apps[0].collections=[{id:'saved',name:'Mis datos',fields:[field('name','Nombre')],rows:[{id:'r',name:'Mi registro'}]}];
 const previous=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify(old)};
 try{assert.deepEqual(loadState(),old);}finally{globalThis.localStorage=previous;}
});
