import {esc,fmt,money,icon,pill,button,empty,valueLabel} from './ui.js';
import {planProduction,collectionOptions} from './domain.js';
import {taxonomyOptions,queryRows,metricValue,calculateBlock} from './adapt-domain.js';
import {filterBar} from './adapt-ui.js';
import {resultMarkup} from './result-motion.js';
export const queryKey=(appId,id)=>`${appId}:${id}`;
export const blockCollection=(app,b)=>app.collections.find(c=>c.id===(b.type==='materials'?'materials':b.type==='orders'?'orders':b.collection));
export const blockCatalog=[{type:'summary',title:'Resumen',icon:'dashboard',copy:'Los números de tu taller, a mano.'},{type:'table',title:'Tabla de datos',icon:'table',copy:'Consultá y editá tus registros.'},{type:'metric',title:'Indicador',icon:'dashboard',copy:'Contá, sumá o promediá tus datos.'},{type:'form',title:'Formulario',icon:'form',copy:'Una pantalla para cargar información.'},{type:'text',title:'Texto',icon:'text',copy:'Indicaciones, notas o una bienvenida.'},{type:'calculator',title:'Calculadora',icon:'calculator',copy:'Un cálculo con tus etiquetas y unidades.'},{type:'materials',title:'Inventario',icon:'box',copy:'Materiales y alertas de stock.'},{type:'orders',title:'Pedidos',icon:'bag',copy:'Del pedido a la producción.'},{type:'recipes',title:'Recetas',icon:'layers',copy:'Materiales y costo por producto.'},{type:'alerts',title:'Alertas de stock',icon:'bolt',copy:'Lo que hace falta reponer.'}];
export function inputField(app,collection,f,value='',prefix='',values={}){
  const id=`${prefix}${f.key}`;const attrs=`id="${esc(id)}" name="${esc(f.key)}" ${f.required?'required':''}`;
  if(f.type==='boolean')return `<label class="check-label"><input type="checkbox" ${attrs} ${value?'checked':''}> ${esc(f.label)}</label>`;
  let input;
  if(f.type==='select'){
    const t=collection.taxonomy,isParent=f.key===t?.categoryKey,isChild=f.key===t?.subcategoryKey,parent=values[t?.categoryKey];
    const opts=isChild?taxonomyOptions(collection,f,parent||'__none__'):collectionOptions(app,collection,f);
    const classification=isParent?`data-classification-category data-collection="${esc(collection.id)}"`:isChild?`data-classification-child data-collection="${esc(collection.id)}" ${parent?'':'disabled'}`:'';
    input=`<select ${attrs} ${classification}><option value="">Elegí una opción</option>${opts.map(o=>`<option value="${esc(o.value)}" ${value===o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
  }else input=`<input ${attrs} type="${f.type==='number'?'number':f.type==='date'?'date':'text'}" ${f.type==='number'?`step="any" ${collection.id==='materials'||f.key==='qty'?'min="0"':''}`:'maxlength="300"'} value="${esc(value)}" placeholder="${esc(f.label)}">`;
  return `<label for="${esc(id)}">${esc(f.label)} ${f.required?'<span class="required">*</span>':''}${input}</label>`;
}

export function table(app,c,opts={}){
  const fields=c.fields.filter(f=>!opts.fields||opts.fields.includes(f.key));
  const rows=queryRows(c,opts);
  if(!fields.length)return empty('Elegí qué campos mostrar','Seleccioná al menos una columna en la configuración.');
  if(!rows.length)return empty(c.rows.length?'No encontramos coincidencias':'Todavía no hay registros',c.rows.length?'Probá con otra búsqueda o cambiá los filtros.':'Cargá tu primer registro para poner este bloque en marcha.',opts.interactive?button(`${icon('plus',16)} Agregar registro`,'add-record',`data-collection="${esc(c.id)}"`,'btn btn-primary'): '');
  return `<div class="table-scroll"><table><thead><tr>${fields.map(f=>`<th>${esc(f.label.replace(' ($)',''))}</th>`).join('')}${opts.interactive?'<th class="action-col"><span class="sr-only">Acciones</span></th>':''}</tr></thead><tbody>${rows.slice(0,opts.limit||200).map(row=>`<tr>${fields.map(f=>`<td>${f.key==='status'?pill(row[f.key],['Terminado','Hecha','Presente','Entregado'].includes(row[f.key])?'success':'neutral'):f.key==='name'?`<span class="table-name"><span class="row-avatar">${esc(String(row[f.key]||'D').slice(0,1).toUpperCase())}</span>${esc(row[f.key])}</span>`:esc(valueLabel(app,c,f,row[f.key]))}</td>`).join('')}${opts.interactive?`<td class="row-actions"><button class="icon-button" data-action="edit-record" data-collection="${esc(c.id)}" data-record="${esc(row.id)}" aria-label="Editar registro">${icon('edit',16)}</button><button class="icon-button" data-action="delete-record" data-collection="${esc(c.id)}" data-record="${esc(row.id)}" aria-label="Eliminar registro">${icon('trash',16)}</button></td>`:''}</tr>`).join('')}</tbody></table></div>${rows.length>(opts.limit||200)?`<p class="table-count">Mostrando ${opts.limit||200} de ${rows.length} registros. Exportá el CSV para ver todos.</p>`:''}`;
}

export function recipeCards(app,interactive=false){return `<div class="recipe-list">${app.recipes.map(r=>{
  let plan;try{plan=planProduction(app,{product:r.id,qty:1});}catch{}
  return `<div class="recipe-card"><div class="recipe-art">${icon('flame',27)}</div><div><h4>${esc(r.name)}</h4><p>${r.ingredients.length} materiales · por unidad</p></div><div class="recipe-cost"><small>Costo de insumos</small><strong>${plan?money(plan.totalCost):'Revisar receta'}</strong></div>${interactive?button('Ver receta','edit-recipe',`data-recipe="${esc(r.id)}"`,'btn btn-small btn-plain'):''}</div>`;
}).join('')}</div>`;}

export function orderCards(app,interactive=false,limit=20,query={}){
  const c=app.collections.find(x=>x.id==='orders'),rows=c?queryRows(c,query):[];
  return rows.length?`<div class="order-list">${rows.slice(0,limit).map(o=>{
    const recipe=app.recipes.find(r=>r.id===o.product);let plan;try{plan=planProduction(app,o);}catch{}
    const done=!!o.producedAt;
    return `<article class="order-card"><div class="order-icon">${icon('bag',22)}</div><div class="order-info"><h4>${esc(o.customer)}</h4><p>${fmt(o.qty)} × ${esc(recipe?.name||'Receta por definir')}</p><span class="order-meta">${esc(o.channel)} · Entrega ${esc(String(o.date||'').split('-').reverse().join('/'))}</span></div><div class="order-state">${pill(o.status,done?'success':'neutral')}<span class="stock-label ${done||plan?.enough?'good':'bad'}">${done?`${icon('check',13)} Producción registrada`:plan?.enough?`${icon('check',13)} Stock suficiente`:`${icon('info',13)} Falta material`}</span></div>${interactive?button(done?'Ver producción':'Calcular y producir','production',`data-record="${esc(o.id)}"`,'btn btn-small btn-plain'):''}</article>`;
  }).join('')}</div>`:empty('Tu próximo pedido empieza acá','Cargá un pedido para calcular lo que necesitás.');
}

export function blockResult(app,b,{interactive=false,editing=false,query={}}={}){
  const can=interactive;let content='';
  const combined={...query,filters:[...(b.filters||[]),...(query.filters||[])]};
  const mats=app.collections.find(x=>x.id==='materials');const orders=app.collections.find(x=>x.id==='orders');
  switch(b.type){
    case 'summary':content=`<div class="stats-grid"><div class="stat"><span>${icon('box',18)} Materiales</span><strong>${mats?.rows.length||0}</strong><small>en tu inventario</small></div><div class="stat"><span>${icon('bag',18)} Por producir</span><strong>${orders?.rows.filter(o=>!o.producedAt).length||0}</strong><small>pedidos pendientes</small></div><div class="stat"><span>${icon('layers',18)} Recetas</span><strong>${app.recipes.length}</strong><small>listas para usar</small></div><div class="stat"><span>${icon('bolt',18)} Para reponer</span><strong>${mats?.rows.filter(m=>Number(m.qty)<=Number(m.min)).length||0}</strong><small>materiales bajo el mínimo</small></div></div>`;break;
    case 'materials':content=mats?table(app,mats,{...combined,fields:b.fields||['name','qty','unit','min',mats.taxonomy?.categoryKey,mats.taxonomy?.subcategoryKey].filter(Boolean),interactive:can,limit:editing?5:200}):empty('Agregá tu tabla de materiales','Podés empezar con la plantilla de velas.');break;
    case 'orders':content=orderCards(app,can,editing?3:200,combined);break;
    case 'recipes':content=recipeCards(app,can);break;
    case 'alerts':{const low=mats?.rows.filter(m=>Number(m.qty)<=Number(m.min))||[];content=low.length?`<div class="alert-list">${low.map(m=>`<div>${icon('info',18)}<span><strong>${esc(m.name)}</strong><small>${fmt(m.qty)} ${esc(m.unit)} · mínimo ${fmt(m.min)}</small></span></div>`).join('')}</div>`:`<div class="all-good"><span>${icon('check',26)}</span><h4>Todo en orden</h4><p>Tus materiales están por encima del stock mínimo.</p></div>`;break;}
    case 'table':{const c=app.collections.find(c=>c.id===b.collection);content=c?table(app,c,{...combined,fields:b.fields,interactive:can,limit:editing?5:200}):empty('Conectá una tabla','Elegí la tabla en la configuración de este bloque.');break;}
    case 'metric':{const c=blockCollection(app,b);if(!c){content=empty('Conectá una tabla','Elegí los datos que querés medir.');break;}const result=metricValue(c,b.metric,combined);content=`<div class="metric-result"><strong>${fmt(result.value)} <small>${esc(b.suffix||'')}</small></strong><span>${fmt(result.count)} registros en esta vista · ${esc({count:'cantidad',sum:'suma',average:'promedio',min:'mínimo',max:'máximo'}[b.metric?.kind||'count'])}</span></div>`;break;}
    case 'form':{const c=app.collections.find(c=>c.id===b.collection);content=c?`<form class="block-form" data-form="runtime-record" data-collection="${esc(c.id)}"><div class="form-grid">${c.fields.filter(f=>!(c.id==='orders'&&f.key==='status')).filter(f=>!b.fields||b.fields.includes(f.key)).map(f=>inputField(app,c,f,'',`${b.id}-`)).join('')}</div>${can?`<button class="btn btn-primary" type="submit">${esc(b.submitLabel||'Guardar registro')}</button>`:'<span class="subtle-note">El formulario se activa al usar tu aplicación.</span>'}</form>`:empty('Elegí una tabla para el formulario','Los campos se crean a partir de tus datos.');break;}
    case 'text':content=`<p class="text-content">${esc(b.text||'Este es tu espacio. Agregá una bienvenida o las instrucciones que tu equipo necesita.').replace(/\n/g,'<br>')}</p>`;break;
    case 'calculator':{const symbol={multiply:'×',add:'+',subtract:'−',divide:'÷'}[b.operation||'multiply'];content=`<form class="calculator-block" data-form="calculate" data-calculator="${esc(b.id)}"><label>${esc(b.leftLabel||'Cantidad')}<input name="quantity" type="number" step="any" value="1" required></label><span aria-hidden="true">${symbol}</span><label>${esc(b.rightLabel||'Valor unitario')}<input name="price" type="number" step="any" value="100" required></label><button class="btn btn-plain" type="submit">Calcular</button><output class="calculation-output" aria-live="polite" aria-atomic="true">${resultMarkup(calculateBlock(b,1,100),{label:b.resultLabel||'Total',format:b.resultFormat,suffix:b.suffix})}</output></form>`;break;}
    default:content=empty('Un nuevo bloque','Elegí qué contenido querés mostrar.');
  }
  return content;
}

export function renderBlock(app,b,{interactive=false,editing=false,query={}}={}){
  const c=blockCollection(app,b),blockIcon=blockCatalog.find(x=>x.type===b.type)?.icon||'blocks';
  const filterable=c&&['table','materials','orders','metric'].includes(b.type);
  return `<div class="block-heading block-tone-${esc(b.type)}"><h3>${icon(blockIcon,18)} ${esc(b.title)}</h3>${interactive&&['materials','table','orders','recipes'].includes(b.type)?button(`${icon('plus',15)} Agregar`,b.type==='recipes'?'new-recipe':'add-record',`data-collection="${esc(c?.id||'')}"`,'btn btn-small btn-plain'):''}</div>${filterable&&b.filters?.length?`<p class="saved-view-note">${icon('eye',14)} Vista con ${b.filters.length} condiciones guardadas</p>`:''}${filterable&&!editing&&b.showFilters!==false?filterBar(c,query,{kind:'block',collection:c.id,block:b.id},b.filterFields,b.filters||[],app):''}<div data-block-results="${esc(b.id)}">${blockResult(app,b,{interactive,editing,query})}</div>`;
}

export function layoutBlocks(app,screen,device){
  const layout=app.layouts[device]||{};return app.blocks.filter(b=>b.screen===screen).sort((a,b)=>(layout[a.id]?.order??app.blocks.indexOf(a))-(layout[b.id]?.order??app.blocks.indexOf(b)));
}

export function runtime(app,ui,role){
  const screen=app.screens.find(s=>s.id===ui.screen)||app.screens[0];
  const device=ui.runtimeDevice||'desktop';const blocks=layoutBlocks(app,screen.id,device);
  const interactive=role!=='reader';
  return `<div class="runtime-page"><div class="runtime-toolbar"><a href="#/constructor/${esc(app.id)}" class="text-link">${icon('back',16)} Volver al constructor</a><div><a href="#/acceso" class="runtime-access-link">${icon('shield',15)} Uso y licencia</a><span class="pill">${app.published?'Aplicación lista':'Vista de uso'}</span><button class="icon-button ${device==='desktop'?'active':''}" data-action="runtime-device" data-device="desktop" aria-label="Vista de computadora">${icon('desktop',18)}</button><button class="icon-button ${device==='mobile'?'active':''}" data-action="runtime-device" data-device="mobile" aria-label="Vista de celular">${icon('mobile',18)}</button></div></div><div class="runtime-system ${device==='mobile'?'mobile-system':''}" style="--app-color:${esc(app.color)}"><aside class="runtime-nav"><span class="app-identity">${app.logo?`<img src="${esc(app.logo)}" alt="">`:icon(app.symbol,27)}<strong>${esc(app.name)}</strong></span><nav>${app.screens.map(s=>`<button data-action="screen" data-screen="${esc(s.id)}" class="${s.id===screen.id?'active':''}">${icon(s.icon,19)} ${esc(s.name)}</button>`).join('')}</nav><span class="powered">Hecho con Ensambla.</span></aside><main id="main" class="runtime-content"><div class="runtime-title"><div><span class="eyebrow">TU SISTEMA / ${esc(screen.name).toUpperCase()}</span><h1>${screen.id==='home'?(app.kind==='candles'?'Tu taller, en orden.':esc(app.name)):esc(screen.name)}</h1></div><span class="runtime-user">IG</span></div>${role==='reader'?'<p class="inline-note">Vista de lectura: podés consultar los datos.</p>':''}<div class="app-canvas ${device==='mobile'?'canvas-mobile':''}">${blocks.map(b=>`<section data-block="${esc(b.id)}" data-type="${esc(b.type)}" class="app-block span-${device==='mobile'?1:(app.layouts.desktop[b.id]?.span||b.span||3)}">${renderBlock(app,b,{interactive,query:ui.blockQueries?.[queryKey(app.id,b.id)]||{}})}</section>`).join('')||empty('Esta pantalla está esperando tus ideas','Volvé al constructor y agregá tu primer bloque.')}</div><p class="runtime-footnote">Datos guardados en este navegador. Los cambios se reflejan en el constructor.</p></main></div></div>`;
}
