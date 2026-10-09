import {configureTaxonomy,candleGroups,validateClassification,taxonomyOptions} from './adapt-domain.js';
export const uid = (prefix='id') => `${prefix}_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export const clone = x => JSON.parse(JSON.stringify(x));
export const today = () => new Date().toISOString().slice(0,10);
export const field = (key,label,type='text',required=false,options=[]) => ({key,label,type,required,options});

export function candleApp(name='Lumbre · taller de velas') {
  const app={
    id:uid('app'),name,description:'De los materiales a cada pedido, todo en un lugar.',kind:'candles',color:'#F97316',symbol:'flame',logo:null,createdAt:today(),published:false,
    collections:[
      {id:'materials',name:'Materiales',fields:[field('name','Material','text',true),field('qty','Stock','number',true),field('unit','Unidad','select',true,['g','ml','m','u']),field('min','Stock mínimo','number'),field('cost','Costo por unidad ($)','number'),field('reusable','Reutilizable','boolean')],rows:[
        {id:'mat1',name:'Cera de soja',qty:850,unit:'g',min:300,cost:9.5,reusable:false},
        {id:'mat2',name:'Parafina',qty:1800,unit:'g',min:300,cost:6.8,reusable:false},
        {id:'mat3',name:'Esencia de vainilla',qty:240,unit:'ml',min:60,cost:45,reusable:false},
        {id:'mat4',name:'Pabilo de algodón',qty:12,unit:'m',min:3,cost:300,reusable:false},
        {id:'mat5',name:'Colorante ámbar',qty:45,unit:'g',min:10,cost:150,reusable:false},
        {id:'mat6',name:'Molde cilíndrico',qty:4,unit:'u',min:1,cost:4200,reusable:true}
      ]},
      {id:'orders',name:'Pedidos',fields:[field('customer','Cliente','text',true),field('product','Producto','select',true,['recipe1','recipe2']),field('qty','Cantidad','number',true),field('date','Entrega','date',true),field('channel','Origen','select',false,['Directo','Mercado Libre']),field('status','Estado','select',true,['Pendiente','En producción','Terminado','Entregado'])],rows:[
        {id:'ord1',customer:'Pedido de ejemplo · Ana',product:'recipe1',qty:3,date:today(),channel:'Directo',status:'Pendiente',deducted:false},
        {id:'ord2',customer:'Pedido de ejemplo · Sofía',product:'recipe2',qty:8,date:today(),channel:'Mercado Libre',status:'Pendiente',deducted:false}
      ]}
    ],
    recipes:[
      {id:'recipe1',name:'Vela vainilla · 160 g',price:6500,ingredients:[{material:'mat1',qty:120},{material:'mat2',qty:40},{material:'mat3',qty:8},{material:'mat4',qty:0.12},{material:'mat5',qty:0.8},{material:'mat6',qty:1}]},
      {id:'recipe2',name:'Vela ámbar · 220 g',price:8200,ingredients:[{material:'mat1',qty:180},{material:'mat2',qty:40},{material:'mat3',qty:10},{material:'mat4',qty:0.16},{material:'mat5',qty:1.2},{material:'mat6',qty:1}]}
    ],
    rules:{checkStock:true,deductStock:true},integration:false,
    screens:[{id:'home',name:'Inicio',icon:'dashboard'},{id:'inventory',name:'Inventario',icon:'box'},{id:'orders',name:'Pedidos',icon:'bag'},{id:'recipes',name:'Recetas',icon:'layers'}],
    blocks:[
      {id:uid('block'),type:'summary',title:'Mi taller en un vistazo',screen:'home',span:3},
      {id:uid('block'),type:'orders',title:'Próximos pedidos',screen:'home',span:2},
      {id:uid('block'),type:'alerts',title:'Para reponer',screen:'home',span:1},
      {id:uid('block'),type:'materials',title:'Mis materiales',screen:'inventory',span:3,collection:'materials'},
      {id:uid('block'),type:'orders',title:'Mis pedidos',screen:'orders',span:3,collection:'orders'},
      {id:uid('block'),type:'recipes',title:'Mis recetas',screen:'recipes',span:3}
    ],layouts:{desktop:{},mobile:{}},activity:[]
  };
  const materials=app.collections[0];
  const t=configureTaxonomy(materials,{categoryLabel:'Familia',subcategoryLabel:'Tipo',groups:candleGroups()});
  materials.rows.forEach((r,i)=>{r[t.categoryKey]=i===5?'tools':'supplies';r[t.subcategoryKey]=['wax','wax','scent','wick','dye','mold'][i];});
  return app;
}

export function blankApp(name='Mi nueva aplicación') {
  return {id:uid('app'),name,description:'Una idea, infinitas posibilidades.',kind:'blank',color:'#F97316',symbol:'blocks',logo:null,createdAt:today(),published:false,collections:[],recipes:[],rules:{checkStock:true,deductStock:true},screens:[{id:'home',name:'Inicio',icon:'dashboard'}],blocks:[],layouts:{desktop:{},mobile:{}},activity:[]};
}

export function simpleApp(kind,name) {
  const app=blankApp(name || (kind==='attendance'?'Mi equipo · presentismo':'Mis proyectos · tareas'));
  app.kind=kind;app.symbol=kind==='attendance'?'users':'check';
  app.collections=[kind==='attendance'?{id:'entries',name:'Presentismo',fields:[field('name','Persona','text',true),field('date','Fecha','date',true),field('status','Estado','select',true,['Presente','Ausente','Tarde'])],rows:[{id:uid(),name:'Persona de ejemplo',date:today(),status:'Presente'}]}:{id:'tasks',name:'Tareas',fields:[field('name','Tarea','text',true),field('date','Fecha límite','date'),field('status','Estado','select',true,['Pendiente','En curso','Hecha'])],rows:[{id:uid(),name:'Preparar mi primera aplicación',date:today(),status:'Pendiente'}]}];
  app.blocks=[{id:uid('block'),type:'table',title:app.collections[0].name,collection:app.collections[0].id,span:3,screen:'home'}];
  return app;
}

export function seedState() {
  return {version:1,profile:{name:'Ignacio Mosquera',email:'ignacio@ejemplo.local',role:'owner'},activeRole:'owner',trialStart:new Date().toISOString(),plan:'trial',apps:[candleApp()],members:[{id:'member1',name:'Persona de ejemplo',email:'equipo@ejemplo.local',role:'editor'}]};
}

export function planProduction(app,order) {
  const qty=Number(order.qty);
  if(!Number.isInteger(qty)||qty<1||qty>100000)throw new Error('La cantidad debe ser un entero entre 1 y 100.000.');
  const recipe=app.recipes.find(x=>x.id===order.product);
  if(!recipe)throw new Error('Elegí una receta válida para este pedido.');
  if(!recipe.ingredients.length)throw new Error('Agregá materiales a la receta antes de producir.');
  const materials=app.collections.find(x=>x.id==='materials')?.rows || [];
  const totals=new Map();
  for(const ingredient of recipe.ingredients){
    if(!Number.isFinite(Number(ingredient.qty))||Number(ingredient.qty)<=0)throw new Error('Las cantidades de la receta deben ser mayores que cero.');
    totals.set(ingredient.material,(totals.get(ingredient.material)||0)+Number(ingredient.qty));
  }
  let totalCost=0;
  const lines=[...totals].map(([key,perUnit])=>{
    const mat=materials.find(x=>x.id===key);if(!mat)throw new Error('Un material de la receta ya no existe. Revisá la receta.');
    const needed=Math.round((mat.reusable?perUnit:perUnit*qty)*10000)/10000;
    const available=Number(mat.qty);if(!Number.isFinite(available)||available<0)throw new Error('Revisá el stock de los materiales.');
    const cost=mat.reusable?0:needed*Number(mat.cost||0);totalCost+=cost;
    return {...mat,needed,available,missing:Math.max(0,Math.round((needed-available)*10000)/10000),cost};
  });
  return {lines,enough:lines.every(x=>x.missing===0),totalCost,recipe,quantity:qty};
}

export function produceOrder(app,orderId) {
  const order=app.collections.find(x=>x.id==='orders')?.rows.find(x=>x.id===orderId);
  if(!order)throw new Error('No encontramos ese pedido.');
  if(order.status==='Terminado'||order.status==='Entregado'||order.producedAt)throw new Error('Este pedido ya fue producido. El stock no se descuenta dos veces.');
  const plan=planProduction(app,order);
  if(!plan.enough)throw new Error('El stock no alcanza. Reponé los materiales antes de producir.');
  if(app.rules.deductStock){
    const materials=app.collections.find(x=>x.id==='materials').rows;
    for(const line of plan.lines.filter(x=>!x.reusable)){
      const mat=materials.find(x=>x.id===line.id);mat.qty=Math.round((Number(mat.qty)-line.needed)*10000)/10000;
    }
    order.deducted=true;
  }
  order.status='Terminado';order.producedAt=new Date().toISOString();order.productionCost=plan.totalCost;
  app.activity.unshift({id:uid(),time:order.producedAt,text:`Producción: ${plan.quantity} × ${plan.recipe.name}. ${order.deducted?'Stock actualizado.':'Descuento automático desactivado.'}`});
  return plan;
}

export function parseCSV(input) {
  const text=String(input).replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/)[0];
  const count=char=>{let quote=false,n=0;for(let i=0;i<first.length;i++){if(first[i]==='"')quote=!quote;else if(!quote&&first[i]===char)n++;}return n;};
  const sep=[';',',','\t'].sort((a,b)=>count(b)-count(a))[0];
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&c===sep){row.push(cell);cell='';}
    else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('Hay comillas sin cerrar en el archivo CSV.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)throw new Error('El CSV necesita una fila de encabezados y al menos un registro.');
  if(rows.length>1001)throw new Error('Podés importar hasta 1.000 registros por archivo.');
  const headers=rows.shift().map(x=>x.trim());
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error('Los encabezados deben tener nombres únicos y no estar vacíos.');
  if(rows.some(x=>x.length!==headers.length))throw new Error('Las filas tienen distinta cantidad de columnas. Revisá el separador del CSV.');
  return {headers,rows,separator:sep};
}

export function inferType(values) {
  const v=values.filter(x=>String(x).trim()!=='');
  if(!v.length)return 'text';
  if(v.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))return 'date';
  if(v.every(x=>/^-?\d+(?:[.,]\d+)?$/.test(String(x))))return 'number';
  return 'text';
}

export function collectionFromCSV(parsed,name='Mis datos',types={}) {
  const fields=parsed.headers.map((h,i)=>field(`col${i}`,h,types[i]||inferType(parsed.rows.map(r=>r[i]))));
  const rows=parsed.rows.map(row=>Object.fromEntries([['id',uid('row')],...fields.map((f,i)=>[f.key,f.type==='number'?(row[i].trim()===''?'':Number(row[i].replace(',','.'))):row[i]])]));
  if(rows.some(r=>fields.some(f=>f.type==='number'&&r[f.key]!==''&&!Number.isFinite(r[f.key]))))throw new Error('Una columna numérica contiene valores que no son números.');
  return {id:uid('table'),name,fields,rows};
}

export function validateRecord(collection,record) {
  for(const f of collection.fields){
    const value=record[f.key];
    if(f.required&&(value===undefined||value===null||String(value).trim()===''))throw new Error(`Completá el campo ${f.label}.`);
    if(f.type==='number'&&value!==''&&value!==undefined&&(!Number.isFinite(Number(value))||(collection.id==='materials'&&Number(value)<0)))throw new Error(`Revisá el valor de ${f.label}.`);
    if(f.type==='select'&&value&&f.options.length&&!f.options.includes(value))throw new Error(`La opción de ${f.label} no es válida.`);
  }
  validateClassification(collection,record);
  if(collection.id==='orders'){
    if(!Number.isInteger(Number(record.qty))||Number(record.qty)<1)throw new Error('La cantidad del pedido debe ser un entero mayor que cero.');
    if(!record.producedAt&&['Terminado','Entregado'].includes(record.status))throw new Error('Usá “Producir pedido” para validar materiales y marcarlo como terminado.');
  }
  return record;
}

export function collectionOptions(app,collection,f){
  return f.key==='product'&&collection.id==='orders'?app.recipes.map(r=>({value:r.id,label:r.name})):taxonomyOptions(collection,f)||(f.options||[]).map(x=>({value:x,label:x}));
}

export function trialDays(state){return Math.max(0,14-Math.floor(Math.max(0,Date.now()-Date.parse(state.trialStart))/86400000));}
