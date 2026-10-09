import {candleApp,blankApp,simpleApp,uid,clone,parseCSV,collectionFromCSV,inferType,planProduction,produceOrder,seedState,field} from './domain.js';
import {loadState,persist,resetState} from './store.js';
import {esc,fmt,money,icon,button,empty} from './ui.js';
import {landing} from './landing.js';
import {builder} from './builder.js';
import {runtime,inputField,table,blockCatalog,layoutBlocks,blockResult,blockCollection,queryKey} from './runtime.js';
import {shell,workspace,admin,guideModal} from './pages.js';
import {createRenderer,createDialogMotion,dismiss,toggleDetails} from './motion.js';
import {layoutPresets,applyLayoutPreset,restoreLayout} from './layout-play.js';
import {accessPage} from './access.js';
import {scenarioAccess} from './licensing.js';
import {bindDialogDismiss} from './dialog-guard.js';
import {bindCarousels} from './carousel.js';
import {bindLanding} from './landing-play.js';
import {animateResult} from './result-motion.js';
import {bindPanelMotion} from './panel-motion.js';
import {configureAppTaxonomy,candleGroups,validateTaxonomy,validateFilters,taxonomyLabel,operatorsFor,operatorLabels,metricValue,calculateBlock,updateQuickFilter} from './adapt-domain.js';
import {taxonomyModal,groupEditor,childEditor,filterBar,filtersModal,filterChips,filterValueInput,filterDescription,updateClassification,readRecordForm} from './adapt-ui.js';

let state=loadState();
const ui={tab:'design',screen:'home',device:matchMedia('(max-width:700px)').matches?'mobile':'desktop',runtimeDevice:matchMedia('(max-width:700px)').matches?'mobile':'desktop',selected:null,collection:null,search:'',dataQueries:{},blockQueries:{},sidebarOpen:false,processView:'simple',layoutUndo:null,accessScenario:'connected',accessOperation:''};
const root=document.querySelector('#app');const modal=document.querySelector('#modal');let imported=null,lastFocus=null,dragged=null,deferredInstall=null;
const navigationMedia=matchMedia('(max-width:1000px)');
function syncNavigation(){
  const sidebar=root.querySelector('#workspace-navigation'),toggle=root.querySelector('[data-action="sidebar-toggle"]');
  if(!sidebar)return;
  const closed=navigationMedia.matches&&!ui.sidebarOpen;
  if(closed&&sidebar.contains(document.activeElement))toggle?.focus({preventScroll:true});
  sidebar.inert=closed;sidebar.setAttribute('aria-hidden',String(closed));
  toggle?.setAttribute('aria-expanded',String(ui.sidebarOpen));toggle?.setAttribute('aria-label',ui.sidebarOpen?'Cerrar navegación':'Abrir navegación');
  root.querySelector('.workspace-shell')?.classList.toggle('sidebar-open',ui.sidebarOpen);
}
navigationMedia.addEventListener('change',syncNavigation);
const swapView=createRenderer(root);const dialogMotion=createDialogMotion(modal);const queryRenderers=new WeakMap();
const dialogDismiss=bindDialogDismiss(modal,()=>closeModal());let clearCarousels=()=>{},clearLanding=()=>{};
const panelMotion=bindPanelMotion(document);
const canEdit=()=>state.activeRole!=='reader';
const canAdmin=()=>state.activeRole==='owner';
const route=()=>location.hash.startsWith('#/')?location.hash.slice(2).split('/'):[''];
const currentApp=()=>state.apps.find(a=>a.id===route()[1])||state.apps.find(a=>a.id===ui.appId)||state.apps[0];
function save(){persist(state);}
function toast(message,type='normal'){
  const d=document.createElement('div');d.className=`toast ${type}`;d.setAttribute('role',type==='error'?'alert':'status');d.innerHTML=`${icon(type==='error'?'info':'check',18)}<span>${esc(message)}</span>`;document.querySelector('#toasts').append(d);setTimeout(()=>dismiss(d),5000);
}
function render(options={}){return swapView(draw,{animate:!modal.open,...options});}
function markup(html){
  const active=document.activeElement;
  const focus=active&&root.contains(active)?{id:active.id,action:active.dataset.action,dataset:{...active.dataset}}:null;
  panelMotion.reset();clearCarousels();clearLanding();root.innerHTML=html;syncNavigation();clearLanding=bindLanding(root);clearCarousels=bindCarousels(root);
  root.querySelectorAll('.builder-block[data-block],.runtime-system .app-block[data-block]').forEach(el=>{el.style.viewTransitionName=`piece-${el.dataset.block.replace(/[^a-z0-9_-]/gi,'_')}`;});
  const tabs=root.querySelector('.builder-tabs'),selected=tabs?.querySelector('button.active'),line=tabs?.querySelector('.tab-active-line');
  if(line&&selected){line.style.left=`${selected.offsetLeft}px`;line.style.width=`${selected.offsetWidth}px`;}
  if(focus){
    let target=focus.id?document.getElementById(focus.id):null;
    if(!target&&focus.action)target=[...root.querySelectorAll('[data-action]')].find(el=>Object.entries(focus.dataset).every(([key,value])=>el.dataset[key]===value));
    target?.focus?.({preventScroll:true});
  }
}
function draw(){
  const [page,id]=route();const app=state.apps.find(a=>a.id===id);
  if(page==='ejemplo'){const example=state.apps.find(a=>a.kind==='candles');if(example){ui.screen='home';location.hash=`#/usar/${example.id}`;return;}}
  if(['constructor','usar'].includes(page)&&!app){markup(shell(state,`<main id="main" class="workspace-main">${empty('Esta aplicación ya no está acá','Volvé a tu espacio para abrir o crear otra aplicación.','<a class="btn btn-dark" href="#/espacio">Ir a mi espacio</a>')}</main>`,page,ui));return;}
  if(app){ui.appId=app.id;if(!app.screens.some(s=>s.id===ui.screen))ui.screen=app.screens[0].id;}
  let content;
  if(page==='espacio')content=workspace(state);
  else if(page==='admin')content=admin(state);
  else if(page==='acceso')content=accessPage(state,ui);
  else if(page==='constructor')content=builder(app,ui,state.activeRole);
  else if(page==='usar')content=runtime(app,ui,state.activeRole);
  else{markup(landing());document.title='Ensambla — Tu sistema, un bloque a la vez';const target=location.hash.slice(1);if(target&&!target.startsWith('/'))requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView());return;}
  markup(shell(state,content,page,ui));document.title=`${app?.name||'Mi espacio'} · Ensambla`;
}
function navigate(path){closeModal();ui.sidebarOpen=false;if(location.hash===`#/${path}`)render();else location.hash=`#/${path}`;}
function openModal(html,wide=false){dialogDismiss.reset();if(!modal.open)lastFocus=document.activeElement;dialogMotion.open(`<button class="icon-button modal-close" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button><div class="dialog-content">${html}<p id="modal-error" class="form-error" role="alert" hidden></p></div>`,wide);}
function closeModal(after){dialogMotion.close(()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});if(typeof after==='function')after();});}
function error(message){const el=modal.open?modal.querySelector('#modal-error'):null;if(el){el.textContent=message;el.hidden=false;}else toast(message,'error');}
function mutate(fn){fn();save();render();}
function requireEdit(){if(!canEdit())throw new Error('La vista de lectura no permite modificar datos.');}
function requireAdmin(){if(!canAdmin())throw new Error('Esta acción es del propietario.');}
function createFrom(kind,name){const app=kind==='candles'?candleApp(name):kind==='blank'?blankApp(name):simpleApp(kind,name);state.apps.push(app);save();ui.appId=app.id;ui.tab='design';ui.screen='home';ui.selected=null;navigate(`constructor/${app.id}`);toast('Tu aplicación está lista para hacerla tuya.');return app;}

function newAppModal(){requireEdit();openModal(`<span class="eyebrow">LA PRIMERA PIEZA</span><h2 id="modal-title">¿Cómo querés empezar?</h2><p class="modal-intro">Elegí un punto de partida. Después podés cambiarlo todo.</p><div class="creation-options"><button data-action="choose-template" data-kind="candles"><span class="creation-symbol warm">${icon('flame',27)}</span><span><strong>Taller de velas</strong><small>Inventario, recetas y pedidos conectados.</small></span>${icon('arrow',19)}</button><button data-action="choose-template" data-kind="attendance"><span class="creation-symbol beige">${icon('users',27)}</span><span><strong>Presentismo</strong><small>Un registro simple para tu equipo.</small></span>${icon('arrow',19)}</button><button data-action="choose-template" data-kind="tasks"><span class="creation-symbol slate">${icon('check',27)}</span><span><strong>Tareas y proyectos</strong><small>Organizá pendientes y estados.</small></span>${icon('arrow',19)}</button><button data-action="import"><span class="creation-symbol beige">${icon('upload',27)}</span><span><strong>Traer mi planilla</strong><small>Importá un CSV y revisá sus columnas.</small></span>${icon('arrow',19)}</button><button data-action="choose-template" data-kind="blank"><span class="creation-symbol outline">${icon('plus',27)}</span><span><strong>Desde cero</strong><small>Un lienzo en blanco para tu idea.</small></span>${icon('arrow',19)}</button></div><p class="subtle-note">Tus aplicaciones se guardan en este navegador.</p>`,true);}
function chooseTemplate(kind){requireEdit();const names={candles:'Mi taller de velas',attendance:'Mi equipo · presentismo',tasks:'Mis proyectos',blank:'Mi nueva aplicación'};openModal(`<span class="eyebrow">TU IDEA EMPIEZA ACÁ</span><h2 id="modal-title">Ponele un nombre.</h2><p class="modal-intro">${kind==='candles'?'Esta plantilla incluye materiales, recetas, pedidos y la regla de descuento de stock.':kind==='blank'?'Vas a empezar con una pantalla vacía. Podés crear tablas, formularios, textos y calculadoras.':'La plantilla trae una tabla y una pantalla listas para adaptar.'}</p><form data-form="create-app" data-kind="${esc(kind)}"><label>Nombre de tu aplicación<input name="name" required maxlength="70" value="${esc(names[kind]||names.blank)}"></label><div class="modal-actions"><button type="button" class="btn btn-plain" data-action="new-app">Volver</button><button class="btn btn-dark" type="submit">Crear mi aplicación ${icon('arrow',17)}</button></div></form>`);}
function recordModal(app,c,record){
  if(!c)throw new Error('Creá o conectá una tabla antes de cargar datos.');
  const values=record||{};const produced=!!record?.producedAt;
  const fields=c.fields.map(f=>{
    let definition=f;if(c.id==='orders'&&f.key==='status')definition={...f,options:produced?['Terminado','Entregado']:['Pendiente','En producción']};
    let html=inputField(app,c,definition,values[f.key]??(f.key==='status'?'Pendiente':''),'modal-',values);
    if(produced&&['product','qty'].includes(f.key))html=html.replace(/<(input|select) /,'<$1 disabled ');
    return html;
  }).join('');
  openModal(`<span class="eyebrow">${esc(c.name).toUpperCase()}</span><h2 id="modal-title">${record?'Editar registro':'Agregar un registro'}</h2>${produced?'<p class="inline-note">La receta y la cantidad quedan fijas después de producir. Podés editar el resto del pedido.</p>':''}<form data-form="record" data-collection="${esc(c.id)}" ${record?`data-record="${esc(record.id)}"`:''}><div class="form-grid">${fields}</div><div class="modal-actions"><button type="button" data-action="close-modal" class="btn btn-plain">Cancelar</button><button class="btn btn-dark" type="submit">Guardar registro</button></div></form>`,true);
}

function productionModal(app,order){const p=planProduction(app,order);const done=!!order.producedAt;openModal(`<span class="eyebrow">DE LA RECETA A LA PRODUCCIÓN</span><h2 id="modal-title">${fmt(order.qty)} × ${esc(p.recipe.name)}</h2><p class="modal-intro">${esc(order.customer)} ${done?'· Producción ya registrada':''}</p><div class="production-table table-scroll"><table><thead><tr><th>Material</th><th>Necesitás</th><th>Disponible ahora</th><th>Estado</th></tr></thead><tbody>${p.lines.map(l=>`<tr><td>${esc(l.name)}${l.reusable?'<small class="reusable">Reutilizable</small>':''}</td><td>${fmt(l.needed)} ${esc(l.unit)}</td><td>${fmt(l.available)} ${esc(l.unit)}</td><td>${done?'Ya registrado':l.missing?`<span class="bad">Faltan ${fmt(l.missing)} ${esc(l.unit)}</span>`:'<span class="good">Alcanza</span>'}</td></tr>`).join('')}</tbody></table></div><div class="production-summary"><div><span>Costo de insumos${done?' registrado':''}</span><strong>${money(done?order.productionCost:p.totalCost)}</strong><small>No incluye mano de obra ni costos fijos.</small></div><div><span>Venta estimada</span><strong>${money(p.recipe.price*Number(order.qty))}</strong></div></div><p class="inline-note">${done?'El pedido ya fue producido. Este detalle usa la receta actual; el costo quedó registrado al producir.':!p.enough?'El stock no alcanza. Reponé lo que falta y volvé a calcular.':app.rules.deductStock?'Al confirmar, se descuentan los insumos una sola vez. Los moldes se conservan.':'El descuento automático está desactivado: se registra la producción y el stock queda igual.'}</p><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">${done?'Cerrar':'Volver'}</button>${!done?`<button class="btn btn-dark" data-action="confirm-production" data-record="${esc(order.id)}" ${p.enough&&canEdit()?'':'disabled'}>${icon('check',17)} Confirmar producción</button>`:''}</div>`,true);}
function importModal(){requireEdit();imported=null;openModal(`<span class="eyebrow">EMPEZÁ CON LO QUE YA TENÉS</span><h2 id="modal-title">Tu planilla, tu primera tabla.</h2><p class="modal-intro">Exportá desde Excel como CSV. Revisamos encabezados y tipos; vos decidís cómo quedan.</p><label class="upload-zone">${icon('upload',34)}<strong>Elegir un archivo CSV</strong><span>Hasta 1 MB · Hasta 1.000 registros</span><input type="file" id="csv-upload" accept=".csv,.tsv,text/csv,text/tab-separated-values"></label><button class="text-link sample-file" data-action="sample-csv">Probar con una planilla preparada ${icon('arrow',16)}</button><p class="subtle-note">Revisá las columnas y elegí los tipos de datos antes de guardar.</p>`);}
function importReview(text,filename='Mis datos.csv'){const parsed=parseCSV(text);imported={parsed,filename};openModal(`<span class="eyebrow">ENCONTRAMOS LAS PIEZAS</span><h2 id="modal-title">${parsed.headers.length} columnas. ${parsed.rows.length} registros.</h2><p class="modal-intro">Revisá los tipos antes de convertir tu archivo en una tabla.</p><form data-form="import-review"><label>Nombre de la tabla<input name="name" required maxlength="70" value="${esc(filename.replace(/\.(csv|tsv)$/i,''))}"></label><div class="import-columns">${parsed.headers.map((h,i)=>`<div><span>${icon('table',17)}<strong>${esc(h)}</strong><small>Ejemplo: ${esc(parsed.rows[0][i].slice(0,45))}</small></span><select name="type${i}" aria-label="Tipo de ${esc(h)}">${[['text','Texto'],['number','Número'],['date','Fecha']].map(([v,l])=>`<option value="${v}" ${inferType(parsed.rows.map(r=>r[i]))===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div><p class="subtle-note">${route()[0]==='constructor'?'La tabla se agrega a esta aplicación.':'Se crea una aplicación nueva con tu tabla y una pantalla lista para usar.'}</p><div class="modal-actions"><button class="btn btn-plain" type="button" data-action="import">Volver</button><button class="btn btn-dark" type="submit">Crear con mis datos ${icon('arrow',17)}</button></div></form>`,true);}
function confirmModal(title,copy,action,attributes=''){openModal(`<h2 id="modal-title">${esc(title)}</h2><p class="modal-intro">${esc(copy)}</p><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">Cancelar</button><button class="btn btn-danger" data-action="${action}" ${attributes}>Confirmar</button></div>`);}
function newTableModal(){openModal(`<span class="eyebrow">LAS PIEZAS DE TU INFORMACIÓN</span><h2 id="modal-title">Creá tu propia tabla.</h2><form data-form="new-table"><label>Nombre de la tabla<input name="name" required maxlength="70" placeholder="Ej.: Materiales, Personas, Reservas"></label><div class="table-field-editor">${fieldEditor('Nombre','text')}${fieldEditor('Cantidad','number')}</div><button type="button" class="text-link" data-action="table-field-add">${icon('plus',16)} Otro campo</button><div class="modal-actions"><button class="btn btn-plain" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-dark" type="submit">Crear tabla</button></div></form>`);}
function fieldEditor(name='',type='text'){return `<div class="field-editor-row"><input name="field_name" value="${esc(name)}" placeholder="Nombre del campo" maxlength="60" required aria-label="Nombre del campo"><select name="field_type" aria-label="Tipo de campo">${[['text','Texto'],['number','Número'],['date','Fecha'],['boolean','Sí / No']].map(([v,l])=>`<option value="${v}" ${type===v?'selected':''}>${l}</option>`).join('')}</select><button type="button" class="icon-button" data-action="table-field-remove" aria-label="Quitar campo">${icon('close',16)}</button></div>`;}
function recipeModal(app,recipe){const r=recipe||{id:'',name:'',price:0,ingredients:[]};const mats=app.collections.find(c=>c.id==='materials')?.rows||[];openModal(`<span class="eyebrow">UNA RECETA, TODOS SUS MATERIALES</span><h2 id="modal-title">${recipe?'Adaptá la receta.':'Creá una receta.'}</h2><form data-form="recipe" data-recipe="${esc(r.id)}"><div class="form-grid"><label>Nombre del producto<input name="name" required value="${esc(r.name)}" maxlength="80"></label><label>Precio de venta ($)<input name="price" type="number" step="any" min="0" value="${r.price}" required></label></div><h3 class="form-subtitle">Cantidad por una unidad de producto</h3><div class="recipe-ingredients">${mats.map(m=>`<label class="ingredient-row"><span><strong>${esc(m.name)}</strong><small>${m.reusable?'Recurso reutilizable por lote':'Insumo que se descuenta'}</small></span><input type="number" step="any" min="0" name="${esc(m.id)}" value="${r.ingredients.find(i=>i.material===m.id)?.qty||0}" aria-label="Cantidad de ${esc(m.name)}"><span>${esc(m.unit)}</span></label>`).join('')}</div><p class="subtle-note">Dejá en 0 los materiales que no usa la receta. El molde se valida por lote y vuelve a usarse.</p><div class="modal-actions"><button class="btn btn-plain" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-dark" type="submit">Guardar receta</button></div></form>`,true);}
function exportFile(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function moveBlock(app,id,delta){const blocks=layoutBlocks(app,ui.screen,ui.device);const index=blocks.findIndex(b=>b.id===id),to=Math.min(blocks.length-1,Math.max(0,index+delta));if(index===-1||index===to)return;const [b]=blocks.splice(index,1);blocks.splice(to,0,b);for(let i=0;i<blocks.length;i++){const b=blocks[i];app.layouts[ui.device][b.id]={...app.layouts[ui.device][b.id],order:i};}save();render({reorder:true});}

function queryScope(el){return {kind:el.dataset.queryScope,collection:el.dataset.collection,block:el.dataset.block};}
function queryCollection(scope){const c=currentApp().collections.find(c=>c.id===scope.collection);if(!c)throw new Error('No encontramos la tabla de esta vista.');return c;}
function getQuery(scope){
  const app=currentApp();
  if(scope.kind==='saved'){const b=app.blocks.find(b=>b.id===scope.block);if(!b)throw new Error('No encontramos el bloque.');return {filters:b.filters||[],search:''};}
  const map=scope.kind==='data'?ui.dataQueries:ui.blockQueries,key=queryKey(app.id,scope.kind==='data'?scope.collection:scope.block);
  return map[key]||(map[key]={search:'',filters:[]});
}
function setQuery(scope,q){
  const c=queryCollection(scope);validateFilters(c,q.filters||[]);
  if(scope.kind==='saved'){requireEdit();currentApp().blocks.find(b=>b.id===scope.block).filters=q.filters;delete ui.blockQueries[queryKey(currentApp().id,scope.block)];save();}
  else{if(scope.kind==='block')validateFilters(c,[...(currentApp().blocks.find(b=>b.id===scope.block)?.filters||[]),...(q.filters||[])]);const map=scope.kind==='data'?ui.dataQueries:ui.blockQueries;map[queryKey(currentApp().id,scope.kind==='data'?scope.collection:scope.block)]=q;}
}
function refreshQuery(scope,{bar=true}={}){
  const app=currentApp(),c=queryCollection(scope),q=getQuery(scope),b=app.blocks.find(b=>b.id===scope.block),editing=route()[0]==='constructor';
  const target=scope.kind==='data'?root.querySelector('#data-table-results'):[...root.querySelectorAll('[data-block-results]')].find(el=>el.dataset.blockResults===scope.block);
  if(target){let swap=queryRenderers.get(target);if(!swap){swap=createRenderer(target,{native:false});queryRenderers.set(target,swap);}const html=scope.kind==='data'?table(app,c,{interactive:canEdit(),...q}):blockResult(app,b,{interactive:!editing&&canEdit(),editing,query:scope.kind==='saved'?{}:q});swap(()=>{if(target.isConnected)target.innerHTML=html;});}
  if(bar&&scope.kind!=='saved'){
    const old=[...root.querySelectorAll('.query-bar')].find(el=>el.dataset.queryScope===scope.kind&&el.dataset.collection===scope.collection&&(scope.kind==='data'||el.dataset.block===scope.block));
    if(old)old.outerHTML=filterBar(c,q,scope,b?.filterFields,b?.filters||[],app);
  }
  if(scope.kind==='saved'){
    const summary=[...root.querySelectorAll('[data-saved-summary]')].find(el=>el.dataset.savedSummary===scope.block);if(summary)summary.textContent=(q.filters||[]).map(r=>filterDescription(c,r,app)).join(' + ');
    const button=[...root.querySelectorAll('[data-action="more-filters"][data-query-scope="saved"]')].find(el=>el.dataset.block===scope.block);if(button)button.innerHTML=`${icon('settings',15)} Vista filtrada${q.filters.length?' · '+q.filters.length:''}`;
    const block=target?.closest('.app-block'),note=block?.querySelector('.saved-view-note');if(note)note.remove();if(q.filters.length)target?.insertAdjacentHTML('beforebegin',`<p class="saved-view-note">${icon('eye',14)} Vista con ${q.filters.length} condiciones guardadas</p>`);
  }
}
function refreshFilterModal(c,scope){
  const form=modal.querySelector('form[data-form="query-filter"]');if(!form||form.dataset.queryScope!==scope.kind||form.dataset.collection!==scope.collection||form.dataset.block!==scope.block)return;
  const chips=modal.querySelector('.filter-manager-chips');chips.innerHTML=filterChips(c,getQuery(scope).filters||[],scope,currentApp())||'<span class="subtle-note">Todavía no hay condiciones.</span>';modal.querySelector('#modal-error').hidden=true;
}
function editTaxonomy(c){requireEdit();const groups=clone(c.taxonomy?.groups||(currentApp().kind==='candles'&&c.id==='materials'?candleGroups():[{id:uid('category'),name:'General',children:[]}]));openModal(taxonomyModal(c,groups),true);}
function revealAdded(el){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el?.animate?.([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.22,.75,.25,1)'});el?.querySelector('input')?.focus({preventScroll:true});}

const actions={
 'edit-taxonomy':e=>editTaxonomy(queryCollection({collection:e.dataset.collection})),
 'add-category':()=>{requireEdit();const box=modal.querySelector('.taxonomy-groups');if(box.children.length>=20)throw new Error('Podés crear hasta 20 categorías.');box.insertAdjacentHTML('beforeend',groupEditor({id:uid('category'),name:'',children:[]}));revealAdded(box.lastElementChild);},
 'remove-category':e=>{requireEdit();if(modal.querySelectorAll('[data-group]').length<=1)throw new Error('Mantené al menos una categoría.');dismiss(e.closest('[data-group]'));},
 'add-subcategory':e=>{requireEdit();const box=e.closest('[data-group]').querySelector('.taxonomy-children');if(box.children.length>=30)throw new Error('Podés crear hasta 30 subcategorías por categoría.');box.insertAdjacentHTML('beforeend',childEditor({id:uid('subcategory'),name:''}));revealAdded(box.lastElementChild);},
 'remove-subcategory':e=>{requireEdit();dismiss(e.closest('[data-subcategory]'));},
 'more-filters':e=>{const scope=queryScope(e),c=queryCollection(scope);if(scope.kind==='saved')requireEdit();openModal(filtersModal(c,getQuery(scope).filters||[],scope,currentApp()));},
 'remove-query-filter':e=>{const scope=queryScope(e),c=queryCollection(scope),q=getQuery(scope);const filters=(q.filters||[]).filter((r,i)=>i!==Number(e.dataset.index));setQuery(scope,{...q,filters});refreshQuery(scope);refreshFilterModal(c,scope);},
 'clear-query':e=>{const scope=queryScope(e);setQuery(scope,{search:getQuery(scope).search||'',filters:[]});refreshQuery(scope);},

 'layout-lab':()=>{requireEdit();const app=currentApp();if(ui.device!=='desktop')throw new Error('En celular, ordená los bloques con las flechas o arrastrando.');openModal(`<span class="eyebrow">EL MISMO SISTEMA, OTRA FORMA</span><h2 id="modal-title">Jugá con la distribución.</h2><p class="modal-intro">Tus bloques y datos siguen siendo los mismos. Probá un ancho distinto y volvé a tu diseño cuando quieras.</p><div class="layout-presets">${layoutPresets.map(p=>`<button data-action="apply-layout" data-preset="${p.id}"><span class="layout-preview" aria-hidden="true">${p.spans.map((span,i)=>`<i style="grid-column:span ${span}" class="piece-color-${i%4}"></i>`).join('')}</span><strong>${p.name}</strong><small>${p.copy}</small><span class="layout-preset-action">Probar ${icon('arrow',15)}</span></button>`).join('')}</div><p class="subtle-note">Se aplica solo a esta pantalla en computadora. La distribución del celular se conserva.</p>`,true);},
 'apply-layout':e=>{requireEdit();const app=currentApp();const before=applyLayoutPreset(app,ui.screen,e.dataset.preset);if(ui.layoutUndo?.appId!==app.id||ui.layoutUndo?.screenId!==ui.screen)ui.layoutUndo=before;save();closeModal(()=>render({reorder:true}));toast('Nueva combinación lista. Podés volver a tu diseño anterior.');},
 'undo-layout':()=>{requireEdit();restoreLayout(currentApp(),ui.layoutUndo);ui.layoutUndo=null;save();render({reorder:true});toast('Volviste a tu diseño anterior.');},
 'access-scenario':e=>{ui.accessScenario=e.dataset.scenario;ui.accessOperation='';render();},
 'access-operation':()=>{const {access,scenario}=scenarioAccess(ui.accessScenario);if(!access.canWrite)throw new Error('Este escenario requiere validar el acceso antes de cargar datos.');ui.accessOperation=scenario.online?'Operación confirmada.':'Operación pendiente de sincronización.';render();toast(ui.accessOperation);},
 'new-app':()=>newAppModal(), 'choose-template':e=>chooseTemplate(e.dataset.kind), 'close-modal':()=>closeModal(),
 'open-example':()=>{closeModal();const app=state.apps.find(a=>a.kind==='candles');if(app){ui.screen='home';navigate(`usar/${app.id}`);}else createFrom('candles');},
 'guided-start':()=>chooseTemplate('candles'), 'guide':()=>openModal(guideModal(currentApp()),true),
 'sidebar-toggle':()=>{ui.sidebarOpen=!ui.sidebarOpen;syncNavigation();if(ui.sidebarOpen){const sidebar=root.querySelector('.workspace-sidebar');if(sidebar)sidebar.scrollTop=0;sidebar?.querySelector('nav a')?.focus({preventScroll:true});}},
 'builder-tab':e=>{ui.tab=e.dataset.tab;ui.search='';ui.selected=null;render();},
 'screen':e=>{ui.screen=e.dataset.screen;ui.selected=null;render();},
 'device':e=>{ui.device=e.dataset.device;render();},'runtime-device':e=>{ui.runtimeDevice=e.dataset.device;render();},
 'select-block':e=>{if(canEdit()){ui.selected=e.dataset.block;render({region:'.inspector'});}},
 'collection':e=>{ui.collection=e.dataset.collection;ui.search='';render();},
 'catalog':()=>{requireEdit();const app=currentApp();openModal(`<span class="eyebrow">UNA PIEZA MÁS</span><h2 id="modal-title">¿Qué necesita tu pantalla?</h2><div class="catalog-grid">${blockCatalog.filter(b=>app.kind==='candles'||!['materials','orders','recipes','alerts','summary'].includes(b.type)).map(b=>`<button data-action="add-block" data-type="${b.type}"><span>${icon(b.icon,25)}</span><strong>${b.title}</strong><small>${b.copy}</small></button>`).join('')}</div>`,true);},
 'add-block':e=>{requireEdit();const app=currentApp(),type=e.dataset.type,c=app.collections[0];const b={id:uid('block'),type,title:blockCatalog.find(x=>x.type===type)?.title||'Mi bloque',screen:ui.screen,span:3,...(['table','form','metric'].includes(type)?{collection:c?.id||''}:{}),...(type==='metric'?{metric:{kind:'count'}}:{}),...(type==='materials'?{collection:'materials'}:{})};app.blocks.push(b);ui.selected=b.id;closeModal();save();render({reorder:true});toast('Bloque agregado. Ajustalo desde la configuración.');},
 'move-block':e=>{requireEdit();moveBlock(currentApp(),e.dataset.block,Number(e.dataset.direction));},
 'remove-block':e=>{requireEdit();const app=currentApp();app.blocks=app.blocks.filter(b=>b.id!==e.dataset.block);ui.selected=null;save();render();toast('Bloque quitado. Los datos de la tabla se conservan.');},
 'new-screen':()=>{requireEdit();openModal(`<h2 id="modal-title">Una nueva pantalla.</h2><form data-form="new-screen"><label>Nombre<input name="name" required maxlength="40" placeholder="Ej.: Clientes, Producción"></label><div class="modal-actions"><button class="btn btn-dark" type="submit">Crear pantalla</button></div></form>`);},
 'publish':()=>{requireEdit();const app=currentApp();app.published=true;save();openModal(`<span class="eyebrow">TU IDEA YA TIENE FORMA</span><h2 id="modal-title">Tu aplicación está lista.</h2><p class="modal-intro">El diseño y los datos se guardaron en este navegador. Podés volver al constructor y seguir ajustando.</p><a class="publish-use-link" href="#/acceso">${icon('shield',17)} Ver uso y acceso ${icon('arrow',15)}</a><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">Seguir editando</button><a class="btn btn-dark" href="#/usar/${esc(app.id)}">Usar mi aplicación ${icon('arrow',17)}</a></div>`);render();},
 'add-record':e=>{requireEdit();const app=currentApp();recordModal(app,app.collections.find(c=>c.id===e.dataset.collection));},
 'edit-record':e=>{requireEdit();const app=currentApp(),c=app.collections.find(c=>c.id===e.dataset.collection);recordModal(app,c,c?.rows.find(r=>r.id===e.dataset.record));},
 'delete-record':e=>{requireEdit();const app=currentApp(),c=app.collections.find(c=>c.id===e.dataset.collection),r=c?.rows.find(r=>r.id===e.dataset.record);if(c?.id==='materials'&&app.recipes.some(recipe=>recipe.ingredients.some(i=>i.material===r?.id)))throw new Error('Este material pertenece a una receta. Quitalo de la receta antes de eliminarlo.');confirmModal('¿Eliminar este registro?',r?.producedAt?'Se elimina el pedido de la lista. El stock que ya se descontó se conserva.':'El registro se elimina de esta tabla y de sus vistas.','confirm-delete-record',`data-collection="${esc(c.id)}" data-record="${esc(r.id)}"`);},
 'confirm-delete-record':e=>{requireEdit();const c=currentApp().collections.find(c=>c.id===e.dataset.collection);c.rows=c.rows.filter(r=>r.id!==e.dataset.record);closeModal();save();render();toast('Registro eliminado.');},
 'production':e=>{const app=currentApp(),order=app.collections.find(c=>c.id==='orders')?.rows.find(r=>r.id===e.dataset.record);productionModal(app,order);},
 'confirm-production':e=>{requireEdit();const app=currentApp(),p=produceOrder(app,e.dataset.record);closeModal();save();render();toast(`Producción registrada: ${p.quantity} unidades. ${app.rules.deductStock?'Stock actualizado.':'Stock conservado.'}`);},
 'new-recipe':()=>{requireEdit();recipeModal(currentApp());},'edit-recipe':e=>{requireEdit();const app=currentApp();recipeModal(app,app.recipes.find(r=>r.id===e.dataset.recipe));},
 'new-table':()=>{requireEdit();newTableModal();},'table-field-add':()=>{const box=modal.querySelector('.table-field-editor');if(box.children.length>=20)throw new Error('Podés agregar hasta 20 campos por tabla.');box.insertAdjacentHTML('beforeend',fieldEditor());},
 'table-field-remove':e=>{const rows=modal.querySelectorAll('.field-editor-row');if(rows.length<=1)throw new Error('La tabla necesita al menos un campo.');e.closest('.field-editor-row').remove();},
 'add-field':e=>{requireEdit();openModal(`<h2 id="modal-title">Un campo propio.</h2><form data-form="add-field" data-collection="${esc(e.dataset.collection)}"><label>Nombre del campo<input name="label" required maxlength="60" placeholder="Ej.: Proveedor"></label><label>Tipo<select name="type"><option value="text">Texto</option><option value="number">Número</option><option value="date">Fecha</option><option value="boolean">Sí / No</option><option value="select">Lista de opciones</option></select></label><label>Opciones, si elegiste una lista<input name="options" placeholder="Ej.: Activo, Pausado, Finalizado"></label><div class="modal-actions"><button class="btn btn-dark" type="submit">Agregar campo</button></div></form>`);},
 'import':()=>importModal(),'sample-csv':()=>importReview('Material;Stock;Unidad;Proveedor\nCera de soja;850;g;Proveedor local\nEsencia de vainilla;240;ml;Proveedor local\nPabilo;12;m;Proveedor local','Materiales.csv'),
 'export-csv':e=>{const c=currentApp().collections.find(c=>c.id===e.dataset.collection);const cell=v=>`"${String(v??'').replace(/"/g,'""')}"`;const body=[c.fields.map(f=>cell(f.label)).join(';'),...c.rows.map(r=>c.fields.map(f=>cell(taxonomyLabel(c,f.key,r[f.key]))).join(';'))].join('\r\n');exportFile(`${c.name.replace(/[^\w-]/g,'_')}.csv`,'\uFEFF'+body,'text/csv;charset=utf-8');toast('CSV exportado.');},
 'process-view':e=>{ui.processView=e.dataset.view;render();},
 'rule-toggle':e=>{requireEdit();currentApp().rules[e.dataset.rule]=e.checked;save();render();toast(e.checked?'Descuento automático activado.':'Descuento automático desactivado.');},
 'open-runtime-orders':()=>{ui.screen='orders';navigate(`usar/${currentApp().id}`);},
 'swatch':e=>{modal.querySelector('input[name="color"]')?.setAttribute('value',e.dataset.color);const input=root.querySelector('input[name="color"]');if(input)input.value=e.dataset.color;e.closest('.color-options')?.querySelectorAll('.color-swatch').forEach(x=>x.classList.toggle('chosen',x===e));},
 'remove-logo':()=>{requireEdit();currentApp().logo=null;save();render();},
 'toggle-integration':()=>{requireEdit();const app=currentApp();if(app.kind!=='candles')throw new Error('Probá esta integración con la plantilla del taller de velas.');app.integration=!app.integration;save();render();toast(app.integration?'Vista de Mercado Libre activada.':'Vista de Mercado Libre cerrada.');},
 'sync-order':()=>{requireEdit();const app=currentApp();if(!app.integration)throw new Error('Abrí primero la vista de Mercado Libre.');const c=app.collections.find(c=>c.id==='orders');c.rows.push({id:uid('ord'),customer:'Pedido · Mercado Libre',product:app.recipes[0]?.id,qty:2,date:new Date().toISOString().slice(0,10),channel:'Mercado Libre',status:'Pendiente',deducted:false});save();render();toast('Pedido agregado. Podés verlo en Datos o en tu aplicación.');},
 'assistant':()=>openModal(`<span class="eyebrow">UN PUNTO DE PARTIDA PARA TU IDEA</span><h2 id="modal-title">Contame qué querés organizar.</h2><p class="modal-intro">Te proponemos un punto de partida. Vos elegís qué hacer con él.</p><form data-form="assistant"><label>Tu idea<textarea name="idea" required rows="4" maxlength="1000" placeholder="Quiero organizar las tareas, los responsables y las fechas de mi proyecto."></textarea></label><button class="btn btn-dark" type="submit">Proponer mis bloques ${icon('spark',17)}</button></form><p class="subtle-note">Contá qué datos necesitás y cómo querés organizarlos.</p>`),
 'plan-info':e=>{const grow=e.dataset.plan==='grow';openModal(`<span class="eyebrow">UNA PROPUESTA PARA CRECER</span><h2 id="modal-title">${grow?'Crecer':'Esencial'}: capacidad que acompaña.</h2><p class="modal-intro">${grow?'Hasta 5 aplicaciones, 10 integrantes adicionales y 25.000 registros.':'1 aplicación, 3 integrantes adicionales y 5.000 registros.'}</p><ul class="plan-proposal"><li>14 días para crear, ajustar y probar antes de elegir.</li><li>Una suscripción por organización, según aplicaciones, integrantes y volumen de registros.</li><li>Integraciones y automatizaciones avanzadas como ampliaciones del plan.</li><li>Precios a validar con costos de alojamiento y pruebas con usuarios.</li></ul><p class="inline-note">Elegí el plan por su capacidad y ajustalo a lo que necesite tu organización.</p><button class="btn btn-dark" data-action="close-modal">Entendido</button>`);},
 'owner-view':()=>{state.activeRole='owner';save();render();},
 'new-member':()=>{requireAdmin();if(state.members.length>=3)throw new Error('Podés agregar hasta 3 accesos adicionales.');openModal(`<h2 id="modal-title">Un acceso para tu equipo.</h2><p class="modal-intro">Elegí quién puede editar y quién puede consultar tus aplicaciones.</p><form data-form="member"><label>Nombre<input name="name" required maxlength="60"></label><label>Email<input name="email" type="email" required maxlength="120"></label><label>Rol<select name="role"><option value="editor">Editor: puede construir y cargar datos</option><option value="reader">Lectura: puede consultar</option></select></label><div class="modal-actions"><button class="btn btn-dark" type="submit">Agregar acceso</button></div></form>`);},
 'delete-member':e=>{requireAdmin();state.members=state.members.filter(m=>m.id!==e.dataset.member);save();render();toast('Acceso quitado.');},
 'export-backup':()=>{requireAdmin();exportFile('Ensambla-copia.json',JSON.stringify(state,null,2));toast('Copia exportada.');},
 'app-options':e=>{const app=state.apps.find(a=>a.id===e.dataset.app);openModal(`<h2 id="modal-title">${esc(app.name)}</h2><div class="app-options-list"><a class="btn btn-plain" href="#/constructor/${esc(app.id)}">${icon('edit',18)} Abrir constructor</a><a class="btn btn-plain" href="#/usar/${esc(app.id)}">${icon('eye',18)} Usar aplicación</a>${canEdit()?button(`${icon('copy',18)} Duplicar aplicación`,'duplicate-app',`data-app="${esc(app.id)}"`,'btn btn-plain'):''}${canAdmin()?button(`${icon('trash',18)} Eliminar aplicación`,'delete-app',`data-app="${esc(app.id)}"`,'btn btn-plain danger'):''}</div>`);},
 'duplicate-app':e=>{requireEdit();const app=clone(state.apps.find(a=>a.id===e.dataset.app));app.id=uid('app');app.name+=' · copia';app.published=false;state.apps.push(app);save();closeModal();render();toast('Copia creada.');},
 'delete-app':e=>{requireAdmin();confirmModal('¿Eliminar esta aplicación?','Se borrarán el diseño y los datos de esta copia local. Podés exportar una copia antes.','confirm-delete-app',`data-app="${esc(e.dataset.app)}"`);},
 'confirm-delete-app':e=>{requireAdmin();state.apps=state.apps.filter(a=>a.id!==e.dataset.app);save();navigate('espacio');toast('Aplicación eliminada.');},
 'offline-info':()=>navigate('acceso'),
 'install':async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;closeModal();}},
 'install-help':()=>openModal(`<h2 id="modal-title">Ensambla, como aplicación.</h2><p class="modal-intro">Si tu navegador ofrece “Instalar aplicación” o “Agregar a pantalla de inicio”, podés usar esa opción. Si no aparece, podés seguir usando el sitio.</p><p class="inline-note">La instalación incluye Ensambla y tus aplicaciones. El permiso de uso mantiene su fecha de vencimiento.</p><a class="publish-use-link" href="#/acceso">Ver la propuesta de uso ${icon('arrow',16)}</a><button class="btn btn-dark" data-action="close-modal">Entendido</button>`)
};

document.addEventListener('click',async event=>{
  const summary=event.target.closest('.faqs summary');if(summary){event.preventDefault();toggleDetails(summary.closest('details'));return;}
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=el.dataset.action;if(!actions[action]||action==='rule-toggle')return;
  if(action==='select-block'&&event.target.closest('input,select,textarea,form,button'))return;
  event.preventDefault();try{await actions[action](el,event);}catch(e){error(e.message||'No pudimos completar esa acción.');}
});
document.addEventListener('submit',event=>{
  const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();const app=currentApp(),fd=new FormData(form);
  try{
    if(form.dataset.form==='calculate'){const b=app.blocks.find(b=>b.id===form.dataset.calculator),value=calculateBlock(b,fd.get('quantity'),fd.get('price'));animateResult(form.querySelector('output'),value,{label:b.resultLabel||'Total',format:b.resultFormat,suffix:b.suffix});return;}
    if(form.dataset.form==='query-filter'){const scope=queryScope(form),c=queryCollection(scope),q=getQuery(scope),rule={field:String(fd.get('field')),op:String(fd.get('op')),value:String(fd.get('value')||'')};if(scope.kind==='saved')requireEdit();const filters=[...(q.filters||[]),rule];validateFilters(c,filters);setQuery(scope,{...q,filters});refreshQuery(scope);refreshFilterModal(c,scope);form.querySelector('[name="value"]')?.focus();return;}
    requireEdit();
    switch(form.dataset.form){
      case 'create-app':createFrom(form.dataset.kind,String(fd.get('name')).trim());return;
      case 'record':case 'runtime-record':{
        const c=app.collections.find(c=>c.id===form.dataset.collection);const old=c.rows.find(r=>r.id===form.dataset.record);const r=readRecordForm(form,c,old,fd);
        if(old)Object.assign(old,r);else c.rows.push(r);closeModal();save();render();toast('Registro guardado.');return;
      }
      case 'block-config':{
        const b=app.blocks.find(b=>b.id===form.dataset.block),next=clone(b);next.title=String(fd.get('title')).trim();
        const changedCollection=fd.has('collection')&&b.collection!==fd.get('collection');
        if(fd.has('collection'))next.collection=String(fd.get('collection'));
        if(changedCollection){delete next.fields;delete next.filters;delete next.filterFields;if(next.type==='metric')next.metric={kind:'count'};}
        else{
          if(form.querySelector('input[name="visible"]'))next.fields=fd.getAll('visible');
          if(form.querySelector('input[name="showFilters"]')){next.showFilters=fd.has('showFilters');next.filterFields=fd.getAll('filterFields');}
          if(b.type==='metric'){next.metric={kind:String(fd.get('metricKind')),field:String(fd.get('metricField')||'')};const source=blockCollection(app,next);if(source)metricValue(source,next.metric,{filters:next.filters||[]});else if(next.metric.kind!=='count')throw new Error('Conectá una tabla para medir sus valores.');}
        }
        if(fd.has('text'))next.text=String(fd.get('text'));
        if(fd.has('submitLabel'))next.submitLabel=String(fd.get('submitLabel')).trim()||'Guardar registro';
        if(fd.has('suffix'))next.suffix=String(fd.get('suffix')).trim();
        if(b.type==='calculator'){for(const key of ['leftLabel','rightLabel','operation','resultLabel','resultFormat'])next[key]=String(fd.get(key)||'').trim();calculateBlock(next,1,1);if(!['money','number'].includes(next.resultFormat))throw new Error('Elegí un formato para el resultado.');}
        const c=blockCollection(app,next);
        if(c){validateFilters(c,next.filters||[]);if(next.filterFields?.includes(c.taxonomy?.subcategoryKey)&&!next.filterFields.includes(c.taxonomy.categoryKey))next.filterFields.push(c.taxonomy.categoryKey);if(next.type==='form'&&next.fields?.includes(c.taxonomy?.subcategoryKey)&&!next.fields.includes(c.taxonomy.categoryKey))next.fields.push(c.taxonomy.categoryKey);}
        Object.assign(b,next);for(const key of ['fields','filters','filterFields'])if(!(key in next))delete b[key];
        if(changedCollection)delete ui.blockQueries[queryKey(app.id,b.id)];
        if(fd.has('span'))app.layouts.desktop[b.id]={...app.layouts.desktop[b.id],span:Number(fd.get('span'))};save();render();toast(changedCollection?'Tabla conectada. Ahora podés ajustar los parámetros.':'Bloque actualizado.');return;
      }
      case 'taxonomy':{
        const groups=[...form.querySelectorAll('[data-group]')].map(g=>({id:g.dataset.group,name:g.querySelector('[data-category-name]').value,children:[...g.querySelectorAll('[data-subcategory]')].map(child=>({id:child.dataset.subcategory,name:child.querySelector('[data-subcategory-name]').value}))}));
        const c=configureAppTaxonomy(app,form.dataset.collection,{categoryLabel:fd.get('categoryLabel'),subcategoryLabel:fd.get('subcategoryLabel'),groups});
        for(const queries of [ui.dataQueries,ui.blockQueries])for(const [key,q] of Object.entries(queries)){if(queries===ui.dataQueries?key!==queryKey(app.id,c.id):!app.blocks.some(b=>key===queryKey(app.id,b.id)&&blockCollection(app,b)?.id===c.id))continue;try{validateFilters(c,q.filters||[]);}catch{delete queries[key];}}
        break;
      }
      case 'new-screen':app.screens.push({id:uid('screen'),name:String(fd.get('name')).trim(),icon:'table'});ui.screen=app.screens.at(-1).id;break;
      case 'new-table':{
        const names=fd.getAll('field_name').map(x=>String(x).trim()),types=fd.getAll('field_type');
        if(new Set(names.map(x=>x.toLowerCase())).size!==names.length)throw new Error('Usá nombres distintos para cada campo.');
        const c={id:uid('table'),name:String(fd.get('name')).trim(),fields:names.map((name,i)=>field(uid('f'),name,types[i])),rows:[]};app.collections.push(c);ui.collection=c.id;ui.tab='data';break;
      }
      case 'add-field':{
        const c=app.collections.find(c=>c.id===form.dataset.collection);const label=String(fd.get('label')).trim();
        if(c.fields.some(f=>f.label.toLowerCase()===label.toLowerCase()))throw new Error('Ya existe un campo con ese nombre.');
        if(c.fields.length>=20)throw new Error('Podés agregar hasta 20 campos por tabla.');
        const opts=String(fd.get('options')).split(',').map(x=>x.trim()).filter(Boolean);if(fd.get('type')==='select'&&!opts.length)throw new Error('Agregá al menos una opción para la lista.');
        c.fields.push(field(uid('f'),label,String(fd.get('type')),false,opts));break;
      }
      case 'recipe':{
        const mats=app.collections.find(c=>c.id==='materials').rows;const ingredients=mats.map(m=>({material:m.id,qty:Number(fd.get(m.id))})).filter(i=>i.qty>0);
        if(!ingredients.length)throw new Error('La receta necesita al menos un material.');
        const r={id:form.dataset.recipe||uid('recipe'),name:String(fd.get('name')).trim(),price:Number(fd.get('price')),ingredients};
        const old=app.recipes.find(x=>x.id===r.id);if(old)Object.assign(old,r);else app.recipes.push(r);
        const f=app.collections.find(c=>c.id==='orders').fields.find(f=>f.key==='product');f.options=app.recipes.map(r=>r.id);break;
      }
      case 'appearance':app.name=String(fd.get('name')).trim();app.description=String(fd.get('description'));app.color=String(fd.get('color'));app.symbol=String(fd.get('symbol'));break;
      case 'interpret-rule':{
        const s=String(fd.get('rule')).toLowerCase();if(!s.includes('@pedido')||!s.includes('@terminado')||!s.includes('@stock')||!s.includes('descont'))throw new Error('Usá esta regla: “Cuando @pedido pase a @terminado, descontar @materiales de @stock”.');
        app.rules.deductStock=true;save();render();toast('Regla interpretada: descuento de materiales al confirmar producción.');return;
      }
      case 'import-review':{
        const types=Object.fromEntries(imported.parsed.headers.map((h,i)=>[i,fd.get(`type${i}`)])),c=collectionFromCSV(imported.parsed,String(fd.get('name')).trim(),types);
        if(route()[0]==='constructor'){app.collections.push(c);ui.collection=c.id;ui.tab='data';}
        else{const fresh=blankApp(`${c.name} · mi aplicación`);fresh.collections.push(c);fresh.blocks.push({id:uid('block'),type:'table',title:c.name,collection:c.id,screen:'home',span:3});state.apps.push(fresh);ui.appId=fresh.id;ui.tab='design';ui.screen='home';save();navigate(`constructor/${fresh.id}`);toast('Tu planilla ya es una tabla editable.');return;}
        imported=null;break;
      }
      case 'assistant':{
        const s=String(fd.get('idea')).toLowerCase();const kind=/vela|cera|parafina|esencia|stock|inventario|pedido/.test(s)?'candles':/asisten|present|horario|personal/.test(s)?'attendance':/tarea|proyecto|pendiente/.test(s)?'tasks':'blank';
        const labels={candles:'Inventario + recetas + pedidos',attendance:'Personas + fechas + estados',tasks:'Tareas + fechas + estados',blank:'Tabla + formulario + calculadora'};
        openModal(`<span class="eyebrow">PROPUESTA SIMULADA</span><h2 id="modal-title">Estas piezas pueden servirte.</h2><div class="assistant-result">${icon('blocks',35)}<strong>${labels[kind]}</strong><p>${kind==='blank'?'Podés partir de cero y definir tus datos y pantallas.':'Podés empezar con una plantilla y adaptar los campos y pantallas a tu idea.'}</p></div><p class="subtle-note">Sugerencia local a partir de palabras clave. La asistencia con IA real es una etapa posterior.</p><div class="modal-actions"><button class="btn btn-plain" data-action="assistant">Cambiar mi idea</button><button class="btn btn-dark" data-action="choose-template" data-kind="${kind}">Usar este punto de partida</button></div>`);return;
      }
      case 'member':{
        requireAdmin();if(state.members.length>=3)throw new Error('Ya hay 3 accesos adicionales.');const email=String(fd.get('email')).trim().toLowerCase();if([state.profile,...state.members].some(m=>m.email.toLowerCase()===email))throw new Error('Ese email ya tiene un acceso.');state.members.push({id:uid('member'),name:String(fd.get('name')).trim(),email,role:String(fd.get('role'))});break;
      }
      default:return;
    }
    closeModal();save();render();toast('Cambios guardados.');
  }catch(e){error(e.message||'Revisá los datos antes de guardar.');}
});

document.addEventListener('change',async event=>{
  const el=event.target;
  try{
    if(el.hasAttribute('data-classification-category')){
      const c=queryCollection({collection:el.dataset.collection});updateClassification(el.closest('form'),c,el.value);return;
    }
    if(el.hasAttribute('data-query-field')){const scope=queryScope(el),c=queryCollection(scope),q=clone(getQuery(scope));updateQuickFilter(c,q,el.dataset.queryField,el.value);setQuery(scope,q);refreshQuery(scope);const next=[...root.querySelectorAll('[data-query-field]')].find(x=>x.dataset.queryScope===scope.kind&&x.dataset.collection===scope.collection&&x.dataset.block===scope.block&&x.dataset.queryField===el.dataset.queryField);next?.focus({preventScroll:true});return;}
    if(el.hasAttribute('data-filter-field')||el.hasAttribute('data-filter-op')){
      const form=el.closest('form'),c=queryCollection(queryScope(form)),f=c.fields.find(f=>f.key===form.elements.field.value),op=form.elements.op;
      if(el.hasAttribute('data-filter-field'))op.innerHTML=operatorsFor(f).map(v=>`<option value="${v}">${operatorLabels[v]}</option>`).join('');
      form.querySelector('.filter-value-editor').innerHTML=filterValueInput(c,f,op.value,'',currentApp());return;
    }
    if(el.dataset.action==='rule-toggle'){actions['rule-toggle'](el);return;}
    if(el.id==='role-select'){state.activeRole=el.value;save();render();toast(`Vista de ${el.options[el.selectedIndex].text.toLowerCase()} activada.`);return;}
    if(el.dataset.memberRole){requireAdmin();state.members.find(m=>m.id===el.dataset.memberRole).role=el.value;save();toast('Permiso actualizado.');return;}
    if(el.id==='csv-upload'){requireEdit();const file=el.files[0];if(!file)return;if(file.size>1048576)throw new Error('El CSV debe pesar menos de 1 MB.');importReview(await file.text(),file.name);return;}
    if(el.id==='logo-upload'){
      requireEdit();const file=el.files[0];if(!file)return;if(file.size>512000)throw new Error('El logo debe pesar menos de 500 KB.');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Usá una imagen PNG, JPG o WebP.');
      const logo=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});currentApp().logo=logo;save();render();toast('Logo actualizado.');return;
    }
    if(el.id==='backup-upload'){
      requireAdmin();const file=el.files[0];if(!file)return;if(file.size>4000000)throw new Error('La copia debe pesar menos de 4 MB.');const s=JSON.parse(await file.text());validateBackup(s);openModal(`<h2 id="modal-title">Restaurar ${s.apps.length} aplicaciones.</h2><p class="modal-intro">La copia reemplaza tus aplicaciones y datos actuales. Exportá lo actual antes si querés conservarlo.</p><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">Cancelar</button><button class="btn btn-dark" data-action="confirm-restore">Restaurar copia</button></div>`);actions['confirm-restore']=()=>{requireAdmin();state=s;state.activeRole='owner';save();ui.appId=null;ui.selected=null;ui.screen='home';ui.dataQueries={};ui.blockQueries={};navigate('espacio');toast('Copia restaurada.');};return;
    }
  }catch(e){error(e.message||'No pudimos leer ese archivo.');el.value='';}
});
document.addEventListener('input',event=>{const el=event.target;if(!el.hasAttribute('data-query-search'))return;try{const scope=queryScope(el);getQuery(scope).search=el.value;refreshQuery(scope,{bar:false});}catch(e){error(e.message);}});
document.addEventListener('dragstart',event=>{const card=event.target.closest('.builder-block');if(!card||!canEdit()||event.target.closest('input,select,textarea')){event.preventDefault();return;}dragged=card.dataset.block;event.dataTransfer.setData('text/plain',dragged);event.dataTransfer.effectAllowed='move';card.classList.add('dragging');});
document.addEventListener('dragover',event=>{const card=event.target.closest('.builder-block');if(card&&dragged){event.preventDefault();event.dataTransfer.dropEffect='move';}});
document.addEventListener('drop',event=>{const card=event.target.closest('.builder-block');if(!card||!dragged)return;event.preventDefault();const app=currentApp(),blocks=layoutBlocks(app,ui.screen,ui.device);const from=blocks.findIndex(b=>b.id===dragged),to=blocks.findIndex(b=>b.id===card.dataset.block);if(from>=0&&to>=0)moveBlock(app,dragged,to-from);dragged=null;});
document.addEventListener('dragend',()=>{dragged=null;document.querySelector('.dragging')?.classList.remove('dragging');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.open&&navigationMedia.matches&&ui.sidebarOpen){event.preventDefault();ui.sidebarOpen=false;syncNavigation();root.querySelector('[data-action="sidebar-toggle"]')?.focus({preventScroll:true});return;}if(event.key==='Enter'&&event.target.matches('.builder-block')){event.preventDefault();actions['select-block'](event.target);}});
modal.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
window.addEventListener('hashchange',()=>{closeModal();ui.sidebarOpen=false;render();if(location.hash.startsWith('#/'))window.scrollTo(0,0);});
window.addEventListener('ensambla-storage-error',()=>toast('No pudimos guardar en este navegador. Exportá una copia desde Administración.','error'));
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;});
function validateBackup(s){
  if(s?.version!==1||!s.profile||!Array.isArray(s.members)||s.members.length>3||!Array.isArray(s.apps)||typeof s.trialStart!=='string')throw new Error('Esta copia no tiene el formato de Ensambla.');
  for(const a of s.apps){if(typeof a.id!=='string'||typeof a.name!=='string'||!/^#[0-9a-f]{6}$/i.test(a.color)||!Array.isArray(a.collections)||!Array.isArray(a.blocks)||!Array.isArray(a.screens)||!a.screens.length||!Array.isArray(a.recipes)||!a.layouts?.desktop||!a.layouts?.mobile||!a.rules||!Array.isArray(a.activity))throw new Error('Una aplicación de la copia está incompleta.');for(const c of a.collections){if(!Array.isArray(c.fields)||!Array.isArray(c.rows)||c.fields.some(f=>!['text','number','date','select','boolean'].includes(f.type)||!Array.isArray(f.options)))throw new Error('Una tabla de la copia tiene un formato inválido.');validateTaxonomy(c);}for(const b of a.blocks){const c=blockCollection(a,b);if(c)validateFilters(c,b.filters||[]);if(b.type==='metric'&&c)metricValue(c,b.metric||{}, {filters:b.filters||[]});if(b.type==='calculator')calculateBlock(b,1,1);}if(a.logo&&!/^data:image\/(png|jpeg|webp);base64,/.test(a.logo))throw new Error('La copia contiene un logo no compatible.');}
}

render();save();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
