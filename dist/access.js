import {esc,icon,pill,button} from './ui.js';
import {accessScenarios,scenarioAccess,OFFLINE_HOURS} from './licensing.js';

export function accessPage(state,ui){
  const {scenario,access}=scenarioAccess(ui.accessScenario);
  const app=state.apps.find(a=>a.published)||state.apps[0];
  return `<main id="main" class="workspace-main access-page">
    <div class="welcome-heading"><div><span class="eyebrow">DEL CONSTRUCTOR A TU DÍA A DÍA</span><h1>Creala. Abrila. Usala<span class="brand-dot">.</span></h1><p>Una app simple de abrir y un acceso con reglas claras.</p></div></div>
    <div class="use-path">
      <article class="use-card use-open"><span class="use-step">01</span><span class="use-icon">${icon('eye',28)}</span><h2>Abrí tu aplicación</h2><p>Entrá desde “Mis aplicaciones”. Usá tus pantallas para cargar datos y trabajar, sin entrar al constructor.</p>${app?`<a href="#/usar/${esc(app.id)}" class="text-link">Probar ${esc(app.name)} ${icon('arrow',17)}</a>`:button('Crear mi primera app','new-app','','text-link')}</article>
      <article class="use-card use-install"><span class="use-step">02</span><span class="use-icon">${icon('mobile',28)}</span><h2>Llevala a tu equipo</h2><p>Abrí Ensambla por su enlace o instalalo como un acceso en tu PC o celular.</p>${button('Cómo instalar Ensambla','install-help','','text-link')}</article>
      <article class="use-card use-team"><span class="use-step">03</span><span class="use-icon">${icon('users',28)}</span><h2>Sumá a tu equipo</h2><p>El propietario define quién construye, quién carga datos y quién consulta. La propuesta usa una suscripción por organización.</p><a href="#/admin" class="text-link">Ver accesos ${icon('arrow',17)}</a></article>
    </div>
    <section class="access-lab" aria-labelledby="access-lab-title">
      <div class="access-lab-heading"><div><span class="eyebrow">PROBÁ LOS DISTINTOS ESCENARIOS</span><h2 id="access-lab-title">Si se corta internet, ¿qué pasa?</h2><p>Proponemos hasta ${OFFLINE_HOURS} horas desde la última validación, con el límite de la prueba o del período pagado.</p></div></div>
      <div class="scenario-options" aria-label="Elegir escenario de acceso">${accessScenarios.map(s=>button(esc(s.label),'access-scenario',`data-scenario="${s.id}" aria-pressed="${scenario.id===s.id}"`,scenario.id===s.id?'scenario-button active':'scenario-button')).join('')}</div>
      <div class="access-result ${access.status}" aria-live="polite"><div class="access-status-icon">${icon(access.canWrite?(scenario.online?'cloud':'offline'):'shield',32)}</div><div class="access-result-copy"><span class="access-state-label">${scenario.online?'CON VALIDACIÓN EN LÍNEA':'SIN UNA NUEVA VALIDACIÓN'}</span><h3>${access.title}</h3><p>${access.copy}</p><div class="access-permissions"><span>${icon('check',15)} Consultar</span><span>${icon('check',15)} Exportar</span><span class="${access.canWrite?'':'unavailable'}">${icon(access.canWrite?'check':'close',15)} Cargar datos</span><span class="${access.canBuild?'':'unavailable'}">${icon(access.canBuild?'check':'close',15)} Construir</span></div></div><div class="lease-window"><strong>${access.canWrite?Math.ceil(access.remainingHours):0}<small>h</small></strong><span>de permiso temporal</span><small>El plazo sigue corriendo aunque cierres la app.</small></div></div>
      <div class="access-lab-action"><div><strong>Revisá el permiso para cargar datos.</strong><p>${ui.accessOperation?esc(ui.accessOperation):'Elegí una situación y revisá el estado del acceso.'}</p></div>${button(`${icon('plus',17)} Probar una operación`,'access-operation',access.canWrite?'':'disabled','btn btn-dark')}</div>

    </section>
    <div class="access-principles"><article><span>${icon('shield',22)}</span><h3>El plazo no se reinicia</h3><p>Cerrar la app, cortar internet o reinstalarla no debería iniciar otra prueba. La cuenta y las fechas se controlan en el servidor.</p></article><article><span>${icon('cloud',22)}</span><h3>Al reconectar, se revisa</h3><p>Se valida el acceso y se revisan los pendientes. Confirmar producción y descontar stock compartido requiere conexión en la propuesta inicial.</p></article><article><span>${icon('eye',22)}</span><h3>Monitoreo con un límite</h3><p>Sin conexión, Ensambla solo conoce la última validación. El uso posterior se informa al reconectar; no se observa en vivo.</p></article></div>
    <div class="access-policy-note">${icon('info',20)}<p>Una licencia firmada dificulta alterar el permiso, pero el código y el reloj de una web siguen bajo control del dispositivo. Para un control estricto, las operaciones esenciales deben validarse en línea.</p></div>
  </main>`;
}
