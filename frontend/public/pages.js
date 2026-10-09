/** Pantallas del espacio y guía del constructor. Muestra la identidad y el rol
 * recibidos de la cuenta real; la administración vive en account-views.js. */
import { esc, icon, brand, button, empty, fmt, pill } from './ui.js';
import { initials } from './account-views.js';
export { administration as admin } from './account-views.js';
import { trialDays } from './domain.js';
export function shell(state, content, route, ui) {
  const space = ui.workspace,
    spaces = ui.workspaces || [],
    avatar = initials(state.profile.name),
    role =
      state.activeRole === 'reader'
        ? 'Lectura'
        : state.activeRole === 'editor'
          ? 'Editor'
          : 'Propietario';
  return `
  <div class="workspace-shell ${ui.sidebarOpen ? 'sidebar-open' : ''}">
    <aside id="workspace-navigation" class="workspace-sidebar">
      <a class="workspace-brand" href="#/">${brand()}</a>
      <div class="workspace-selector"><span class="workspace-square">${esc(avatar)}</span><span>
        ${spaces.length > 1 ? `<label for="account-workspace-selector" class="sr-only">Elegir espacio</label><select id="account-workspace-selector" data-account-workspace>${spaces.map((w) => `<option value="${esc(w.id)}" ${w.id === space?.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select>` : `<strong>${esc(space?.name || 'Mi espacio')}</strong>`}
        <small>Mis aplicaciones y datos</small>
      </span></div>
      <nav aria-label="Mi espacio">
        <a href="#/espacio" class="${route === 'espacio' ? 'active' : ''}">${icon('dashboard')} Mis aplicaciones</a>
        ${state.activeRole !== 'reader' ? `<button data-action="new-app">${icon('plus')} Crear aplicación</button>` : ''}
        <button data-action="assistant">${icon('spark')} Asistente</button>
        <a href="#/admin" class="${route === 'admin' ? 'active' : ''}">${icon('users')} Cuenta y accesos</a>
        <a href="#/acceso" class="${route === 'acceso' ? 'active' : ''}">${icon('shield')} Uso y licencia</a>
        <button data-action="guide">${icon('help')} Primeros pasos</button>
      </nav>
      <div class="sidebar-bottom">
        <div class="trial-card"><span>${icon('bolt', 17)} TU ESPACIO PARA EXPLORAR</span><strong>${trialDays(state)} días de prueba</strong><p>Probá, cambiá y volvé a probar.</p><button data-action="plan-info" data-plan="essential">Ver planes ${icon('arrow', 14)}</button></div>
        <div class="sidebar-profile"><span class="profile-avatar">${esc(avatar)}</span><div><strong>${esc(state.profile.name)}</strong><small>${role}</small></div></div>
        <button class="sidebar-logout" data-account-action="logout">${icon('logout', 17)} Cerrar sesión</button>
        <a class="back-site" href="#/">${icon('arrow', 15)} Volver al sitio</a>
      </div>
    </aside>
    <div class="workspace-body">
      <header class="workspace-header">
        <button class="icon-button mobile-menu" id="workspace-menu-toggle" data-action="sidebar-toggle" aria-controls="workspace-navigation" aria-expanded="${ui.sidebarOpen ? 'true' : 'false'}" aria-label="${ui.sidebarOpen ? 'Cerrar navegación' : 'Abrir navegación'}">${icon('menu')}</button>
        <span class="workspace-breadcrumb">Mi espacio <span>/</span> ${route === 'admin' ? 'Cuenta y accesos' : route === 'acceso' ? 'Uso y licencia' : route === 'constructor' ? 'Constructor' : route === 'usar' ? 'Mi aplicación' : 'Mis aplicaciones'}</span>
        <div class="workspace-header-right"><span class="account-role">${role}</span><span class="profile-avatar small">${esc(avatar)}</span></div>
      </header>
      ${content}
    </div>
  </div>`;
}

export function workspace(state) {
  return `<main id="main" class="workspace-main"><div class="welcome-heading"><div><span class="eyebrow">UN ESPACIO PARA TUS IDEAS</span><h1>Hola, ${esc(state.profile.name.split(/\s+/)[0])}<span class="brand-dot">.</span></h1><p>¿Qué querés construir hoy?</p></div>${state.activeRole !== 'reader' ? button(`${icon('plus', 19)} Crear aplicación`, 'new-app', '', 'btn btn-dark') : ''}</div><section class="welcome-banner"><div><span class="banner-icon">${icon('spark', 28)}</span><div><h2>Hay una app en tu próxima idea.</h2><p>Elegí piezas, combiná y probá. Empezar es parte del juego.</p></div></div><button class="btn btn-plain" data-action="guide">Mostrarme cómo ${icon('arrow', 17)}</button><span class="banner-decoration play-pieces" aria-hidden="true"><i>${icon('table', 26)}</i><i>${icon('form', 25)}</i><i>${icon('bolt', 23)}</i><i>${icon('calculator', 24)}</i></span></section><div class="apps-heading"><h2>Mis aplicaciones <span>${state.apps.length}</span></h2><span class="subtle-note">Guardadas en este navegador</span></div><div class="apps-grid">${state.apps.map((app) => `<article class="application-card"><a href="#/${state.activeRole === 'reader' ? 'usar' : 'constructor'}/${esc(app.id)}" class="application-cover ${app.kind === 'candles' ? 'candle-cover' : app.kind === 'attendance' ? 'attendance-cover' : 'generic-cover'}" style="--app-color:${esc(app.color)}" aria-label="Abrir ${esc(app.name)}">${app.kind === 'candles' ? '<div class="mini-candles"><i></i><i></i><i></i></div>' : `<span class="cover-big-icon">${icon(app.symbol, 60)}</span>`}<span class="cover-label">${app.kind === 'candles' ? 'HECHO PARA TU TALLER' : app.kind === 'attendance' ? 'HECHO PARA TU EQUIPO' : 'HECHO A TU MANERA'}</span><span class="cover-edit">${icon('edit', 16)}</span></a><div class="application-info"><div>${pill(app.published ? 'Lista para usar' : 'En construcción', app.published ? 'success' : 'neutral')}${state.activeRole !== 'reader' ? `<button class="icon-button" data-action="app-options" data-app="${esc(app.id)}" aria-label="Opciones de ${esc(app.name)}">${icon('settings', 17)}</button>` : ''}</div><h3><a href="#/${state.activeRole === 'reader' ? 'usar' : 'constructor'}/${esc(app.id)}">${esc(app.name)}</a></h3><p>${esc(app.description)}</p><div class="app-card-footer"><span>${icon('table', 14)} ${app.collections.length} tablas <span>·</span> ${app.blocks.length} bloques</span><a class="text-link" href="#/usar/${esc(app.id)}">Usar ${icon('arrow', 15)}</a></div></div></article>`).join('')}${state.activeRole !== 'reader' ? `<button class="new-application-card" data-action="new-app"><span>${icon('plus', 30)}</span><h3>Una nueva idea</h3><p>Tu próxima aplicación empieza con una pieza.</p></button>` : ''}</div><section class="start-options"><div><span class="eyebrow">¿POR DÓNDE EMPEZAMOS?</span><h2>Cada idea tiene su camino.</h2></div><div class="start-option-list"><button data-action="new-app">${icon('blocks', 24)}<span><strong>Elegir una plantilla</strong><small>Un punto de partida listo para adaptar.</small></span>${icon('arrow', 18)}</button><button data-action="import">${icon('upload', 24)}<span><strong>Traer mi planilla</strong><small>Tus columnas se convierten en una tabla.</small></span>${icon('arrow', 18)}</button><button data-action="choose-template" data-kind="blank">${icon('plus', 24)}<span><strong>Empezar desde cero</strong><small>Un lienzo abierto para tu propia idea.</small></span>${icon('arrow', 18)}</button></div></section><p class="workspace-note">${icon('info', 16)} Tus aplicaciones y datos se guardan en este navegador. Exportá una copia para conservarlos.</p></main>`;
}

export function guideModal(app) {
  return `<span class="eyebrow">TU PRIMER RECORRIDO</span><h2 id="modal-title">Armemos una app, paso a paso.</h2><p class="modal-intro">En el taller de velas podés recorrer todo el proceso.</p><ol class="guide-steps"><li><span>1</span><div><strong>Elegí tu punto de partida</strong><p>Usá la plantilla del taller, importá un CSV o empezá desde cero.</p></div></li><li><span>2</span><div><strong>Adaptá tus datos</strong><p>En “Datos”, agregá campos y abrí “Categorías y subcategorías”. Ponele tus propios nombres a los dos niveles y clasificá tus registros.</p></div></li><li><span>3</span><div><strong>Armá tus pantallas</strong><p>En “Diseño”, conectá una tabla, un formulario o un indicador. Elegí los campos y guardá una “Vista filtrada” en el bloque. Los datos se comparten entre todas las vistas.</p></div></li><li><span>4</span><div><strong>Conectá el proceso</strong><p>En “Procesos”, revisá la regla que descuenta los insumos de cada receta.</p></div></li><li><span>5</span><div><strong>Probalo con un pedido</strong><p>Abrí “Probar”, calculá los materiales y confirmá la producción.</p></div></li></ol><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">Entendido</button><button class="btn btn-dark" data-action="guided-start">Empezar con la plantilla ${icon('arrow', 17)}</button></div>`;
}
