const key=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
export const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
export const operatorLabels={eq:'es',neq:'no es',contains:'contiene',gt:'mayor que',gte:'al menos',lt:'menor que',lte:'como máximo',empty:'sin valor',notempty:'con valor'};
export const candleGroups=()=>[
  {id:'supplies',name:'Insumos',children:[{id:'wax',name:'Ceras'},{id:'scent',name:'Esencias'},{id:'wick',name:'Pabilos'},{id:'dye',name:'Colorantes'}]},
  {id:'tools',name:'Recursos',children:[{id:'mold',name:'Moldes'}]},
];
export function taxonomyOptions(c,f,parent){
  const t=c.taxonomy;if(!t)return null;
  if(f.key===t.categoryKey)return t.groups.map(g=>({value:g.id,label:g.name}));
  if(f.key===t.subcategoryKey)return (parent?t.groups.filter(g=>g.id===parent):t.groups).flatMap(g=>g.children.map(s=>({value:s.id,label:parent?s.name:`${g.name} / ${s.name}`})));
  return null;
}
export function taxonomyLabel(c,fieldKey,value){
  const t=c.taxonomy;if(!t)return value;
  if(fieldKey===t.categoryKey)return t.groups.find(g=>g.id===value)?.name||value;
  if(fieldKey===t.subcategoryKey)return t.groups.flatMap(g=>g.children).find(s=>s.id===value)?.name||value;
  return value;
}
function checkGroups(groups){
  if(!Array.isArray(groups)||!groups.length||groups.length>20)throw new Error('Definí entre 1 y 20 categorías.');
  const ids=new Set(),names=new Set();
  for(const g of groups){
    if(!g||!/^[-\w]{1,90}$/.test(g.id)||!String(g.name||'').trim()||String(g.name).length>60||ids.has(g.id)||names.has(normalize(g.name)))throw new Error('Las categorías necesitan nombres e identificadores distintos.');
    ids.add(g.id);names.add(normalize(g.name));
    if(!Array.isArray(g.children)||g.children.length>30)throw new Error('Cada categoría admite hasta 30 subcategorías.');
    const children=new Set();
    for(const s of g.children){
      if(!s||!/^[-\w]{1,90}$/.test(s.id)||!String(s.name||'').trim()||String(s.name).length>60||ids.has(s.id)||children.has(normalize(s.name)))throw new Error('Revisá los nombres e identificadores de las subcategorías.');
      ids.add(s.id);children.add(normalize(s.name));
    }
  }
}
export function validateClassification(c,row,t=c.taxonomy){
  if(!t)return;
  const category=row[t.categoryKey],sub=row[t.subcategoryKey];
  const parent=t.groups.find(g=>g.id===category);
  if(category&&!parent)throw new Error(`La opción de ${t.categoryLabel} no es válida.`);
  if(sub&&(!parent||!parent.children.some(s=>s.id===sub)))throw new Error(`${t.subcategoryLabel} debe pertenecer a la categoría elegida.`);
}
export function configureTaxonomy(c,config){
  if(!config||!Array.isArray(config.groups))throw new Error('Definí tus categorías.');
  const t={...c.taxonomy,categoryKey:c.taxonomy?.categoryKey||key('category'),subcategoryKey:c.taxonomy?.subcategoryKey||key('subcategory'),categoryLabel:String(config.categoryLabel||'').trim(),subcategoryLabel:String(config.subcategoryLabel||'').trim(),groups:config.groups.map(g=>({id:g.id,name:String(g.name).trim(),children:g.children.map(s=>({id:s.id,name:String(s.name).trim()}))}))};
  checkGroups(t.groups);
  if(!t.categoryLabel||!t.subcategoryLabel||t.categoryLabel.length>60||t.subcategoryLabel.length>60||normalize(t.categoryLabel)===normalize(t.subcategoryLabel))throw new Error('Dale nombres distintos a los dos niveles.');
  const keys=[t.categoryKey,t.subcategoryKey];
  if(c.fields.some(f=>!keys.includes(f.key)&&[normalize(t.categoryLabel),normalize(t.subcategoryLabel)].includes(normalize(f.label))))throw new Error('Ya existe un campo con ese nombre. Elegí otro nombre para los niveles.');
  if(c.fields.filter(f=>!keys.includes(f.key)).length+2>20)throw new Error('La tabla admite hasta 20 campos, incluidos los dos niveles.');
  for(const row of c.rows)validateClassification(c,row,t); // Refuse removal or reparenting of values in use, before mutation.
  const fields=c.fields.filter(f=>!keys.includes(f.key));
  for(const [fieldKey,label,options] of [[t.categoryKey,t.categoryLabel,t.groups.map(g=>g.id)],[t.subcategoryKey,t.subcategoryLabel,t.groups.flatMap(g=>g.children.map(s=>s.id))]])fields.push({...c.fields.find(f=>f.key===fieldKey),key:fieldKey,label,type:'select',required:false,options});
  c.taxonomy=t;c.fields=fields;return t;
}
export function validateTaxonomy(c){
  const t=c.taxonomy;if(!t)return;
  checkGroups(t.groups);
  if(!/^[-\w]{1,90}$/.test(t.categoryKey)||!/^[-\w]{1,90}$/.test(t.subcategoryKey)||t.categoryKey===t.subcategoryKey||typeof t.categoryLabel!=='string'||typeof t.subcategoryLabel!=='string'||!t.categoryLabel.trim()||!t.subcategoryLabel.trim()||t.categoryLabel.length>60||t.subcategoryLabel.length>60||normalize(t.categoryLabel)===normalize(t.subcategoryLabel))throw new Error('La organización de categorías está incompleta.');
  for(const [k,label,ids] of [[t.categoryKey,t.categoryLabel,t.groups.map(g=>g.id)],[t.subcategoryKey,t.subcategoryLabel,t.groups.flatMap(g=>g.children.map(s=>s.id))]]){const f=c.fields.find(f=>f.key===k);if(!f||f.type!=='select'||f.label!==label||!Array.isArray(f.options)||f.options.length!==ids.length||ids.some(id=>!f.options.includes(id)))throw new Error('Revisá los campos y opciones de categorías.');}
  for(const r of c.rows)validateClassification(c,r);
}
export function operatorsFor(f){return ['eq','neq',...(f.type==='text'?['contains']:[]),...(['number','date'].includes(f.type)?['gt','gte','lt','lte']:[]),'empty','notempty'];}
export function validateFilters(c,filters=[]){
  if(!Array.isArray(filters)||filters.length>12)throw new Error('Usá hasta 12 condiciones por vista.');
  for(const rule of filters){
    const f=c.fields.find(f=>f.key===rule?.field);
    if(!f||!operatorsFor(f).includes(rule.op))throw new Error('Revisá el campo y la condición del filtro.');
    if(['empty','notempty'].includes(rule.op))continue;
    if(rule.value===undefined||rule.value===null||String(rule.value).trim()==='')throw new Error('Completá el valor del filtro.');
    if(f.type==='number'&&!Number.isFinite(Number(rule.value)))throw new Error('El filtro necesita un número válido.');
    if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(rule.value)||!Number.isFinite(Date.parse(rule.value))||new Date(rule.value).toISOString().slice(0,10)!==rule.value))throw new Error('El filtro necesita una fecha válida.');
    if(f.type==='boolean'&&!['true','false'].includes(String(rule.value)))throw new Error('Elegí Sí o No.');
    if(f.type==='select'&&!f.options.includes(rule.value))throw new Error('Elegí una opción disponible para el filtro.');
  }
  return filters;
}
export function matchesFilter(c,row,rule){
  const f=c.fields.find(f=>f.key===rule.field);if(!f)return false;
  const raw=row[f.key],blank=raw===undefined||raw===null||String(raw).trim()==='';
  if(rule.op==='empty')return blank;if(rule.op==='notempty')return !blank;
  if(blank)return rule.op==='neq';
  const a=f.type==='number'?Number(raw):normalize(raw),b=f.type==='number'?Number(rule.value):normalize(rule.value);
  if(f.type==='number'&&!Number.isFinite(a))return false;
  switch(rule.op){case 'eq':return a===b;case 'neq':return a!==b;case 'contains':return normalize(taxonomyLabel(c,f.key,raw)).includes(b);case 'gt':return a>b;case 'gte':return a>=b;case 'lt':return a<b;case 'lte':return a<=b;default:return false;}
}
export function queryRows(c,{search='',filters=[]}={}){
  validateFilters(c,filters);const term=normalize(search);
  return c.rows.filter(r=>filters.every(rule=>matchesFilter(c,r,rule))&&(!term||c.fields.some(f=>normalize(taxonomyLabel(c,f.key,r[f.key])).includes(term))));
}
export function metricValue(c,metric={},query={}){
  const rows=queryRows(c,query),kind=metric.kind||'count';
  if(kind==='count')return {value:rows.length,count:rows.length};
  const f=c.fields.find(f=>f.key===metric.field&&f.type==='number');
  if(!f||!['sum','average','min','max'].includes(kind))throw new Error('Elegí un campo numérico para el indicador.');
  const values=rows.map(r=>r[f.key]).filter(v=>v!==''&&v!==undefined&&v!==null&&Number.isFinite(Number(v))).map(Number);
  const sum=values.reduce((a,b)=>a+b,0);
  return {value:!values.length?0:kind==='sum'?sum:kind==='average'?sum/values.length:kind==='min'?Math.min(...values):Math.max(...values),count:rows.length};
}
export function calculateBlock(b,left,right){
  if([left,right].some(v=>v==null||String(v).trim()===''))throw new Error('Completá ambos valores con números válidos.');
  const a=Number(left),n=Number(right);if(!Number.isFinite(a)||!Number.isFinite(n))throw new Error('Completá ambos valores con números válidos.');
  const operation=b.operation||'multiply';if(!['multiply','add','subtract','divide'].includes(operation))throw new Error('Elegí una operación válida.');if(operation==='divide'&&n===0)throw new Error('No se puede dividir por cero.');
  const value=operation==='add'?a+n:operation==='subtract'?a-n:operation==='divide'?a/n:a*n;
  if(!Number.isFinite(value))throw new Error('El resultado excede el rango disponible.');return value;
}
export function updateQuickFilter(c,query,field,value){
  let filters=(query.filters||[]).filter(r=>!(r.field===field&&r.op==='eq'));
  if(field===c.taxonomy?.categoryKey)filters=filters.filter(r=>r.field!==c.taxonomy.subcategoryKey);
  if(value!=='')filters.push({field,op:'eq',value});
  validateFilters(c,filters);query.filters=filters;return query;
}
export function configureAppTaxonomy(app,collectionId,config){
  const c=app.collections.find(c=>c.id===collectionId);if(!c)throw new Error('No encontramos la tabla.');
  const candidate=JSON.parse(JSON.stringify(c));configureTaxonomy(candidate,config);
  for(const b of app.blocks){const id=b.type==='materials'?'materials':b.type==='orders'?'orders':b.collection;if(id===c.id)validateFilters(candidate,b.filters||[]);}
  c.taxonomy=candidate.taxonomy;c.fields=candidate.fields;return c;
}
