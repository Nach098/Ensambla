/** Vistas de registro, acceso y administración. Cada función dibuja una sección
 * con datos de la cuenta real; escapa textos y mantiene los formularios accesibles. */
import { brand, esc, icon, empty, pill } from './ui.js';

export const roleLabels = { owner: 'Propietario', editor: 'Editor', viewer: 'Lectura' };
export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase() || 'E'
  );
}

function feedback() {
  return `<p class="form-error" data-account-error role="alert" hidden></p>
    <p class="account-success" data-account-success role="status" hidden></p>`;
}

function credentialsForm(register) {
  return `
    <form data-account-form="${register ? 'register' : 'login'}" class="account-form">
      ${
        register
          ? `
        <label for="account-name">Tu nombre
          <input id="account-name" name="displayName" autocomplete="name" required minlength="2" maxlength="120">
        </label>`
          : ''
      }
      <label for="account-email">Correo electrónico
        <input id="account-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254">
      </label>
      <label for="account-password">Contraseña
        <div class="account-password">
          <input id="account-password" name="password" type="password"
            autocomplete="${register ? 'new-password' : 'current-password'}" required
            minlength="${register ? '15' : '1'}" maxlength="128"
            ${register ? 'aria-describedby="password-hint"' : ''}>
          <button type="button" class="icon-button" data-account-action="show-password"
            data-input="account-password" aria-label="Mostrar contraseña" aria-pressed="false">
            ${icon('eye', 20)}
          </button>
        </div>
      </label>
      ${
        register
          ? `
        <p id="password-hint" class="account-hint">Entre 15 y 128 caracteres. Podés usar una frase con espacios.</p>
        <label for="account-workspace">Nombre de tu espacio
          <input id="account-workspace" name="workspaceName" required maxlength="120"
            placeholder="Mi negocio, mi equipo, mi idea…">
        </label>`
          : ''
      }
      ${feedback()}
      <button type="submit" class="btn btn-primary account-submit">
        ${register ? 'Crear mi cuenta' : 'Entrar a mi espacio'} ${icon('arrow', 18)}
      </button>
    </form>`;
}

export function accountPage(mode = 'login') {
  const register = mode === 'register';
  return `
    <div class="account-page">
      <header class="account-header">
        <a href="#/" aria-label="Ensambla, volver al inicio">${brand()}</a>
        <a class="text-link" href="#/">Volver al sitio ${icon('arrow', 17)}</a>
      </header>
      <main id="main" class="account-layout">
        <section class="account-story">
          <span class="eyebrow">TU PRÓXIMA IDEA EMPIEZA ACÁ</span>
          <h1>${register ? 'Un espacio propio.<br>Infinitas posibilidades.' : 'Tus ideas tienen<br>un lugar acá.'}</h1>
          <p>${
            register
              ? 'Creá tu cuenta y empezá a combinar piezas para trabajar a tu manera.'
              : 'Entrá a tu espacio para seguir creando y encontrar lo que dejaste preparado.'
          }</p>
          <div class="account-pieces" aria-hidden="true">
            <span>${icon('table', 30)}</span><span>${icon('form', 30)}</span><span>${icon('blocks', 30)}</span>
          </div>
          <ul class="account-benefits">
            <li>${icon('check', 18)} Un espacio para tus aplicaciones</li>
            <li>${icon('check', 18)} Tu equipo con sus propios accesos</li>
            <li>${icon('check', 18)} Vos decidís cómo se trabaja</li>
          </ul>
        </section>
        <section class="account-card" aria-labelledby="account-title">
          <span class="eyebrow">${register ? 'LA PRIMERA PIEZA' : 'SEGUÍ DONDE QUEDASTE'}</span>
          <h2 id="account-title" tabindex="-1">${register ? 'Creá tu cuenta' : 'Iniciá sesión'}</h2>
          <p>${register ? 'Completá tus datos y dale nombre a tu espacio.' : 'Usá el correo y la contraseña de tu cuenta.'}</p>
          ${credentialsForm(register)}
          <p class="account-switch">${
            register
              ? '¿Ya tenés cuenta? <a href="#/ingresar">Iniciá sesión</a>'
              : '¿Recién llegás? <a href="#/registro">Creá tu cuenta</a>'
          }</p>
        </section>
      </main>
    </div>`;
}

export function accountWaiting(unavailable = false) {
  return `<main id="main" class="account-waiting">
    <a class="account-brand" href="#/">${brand()}</a>
    ${empty(
      unavailable ? 'No pudimos conectar con tu cuenta' : 'Preparando tu espacio',
      unavailable
        ? 'Tus cambios guardados siguen en este navegador. Reconectá para verificar tu sesión y permisos.'
        : 'Estamos verificando tu sesión y tus accesos.',
      unavailable
        ? '<button class="btn btn-dark" data-account-action="retry">Volver a intentar</button><a class="btn btn-plain" href="#/">Ir al inicio</a>'
        : '<span class="account-loading" role="status">Conectando…</span>',
    )}
  </main>`;
}

function profileCard(user) {
  return `<section class="admin-card">
    <h2>Tu cuenta</h2><p class="account-hint">${esc(user.email)}</p>
    <form data-account-form="profile" class="account-form">
      <label for="profile-name">Tu nombre
        <input id="profile-name" name="displayName" value="${esc(user.displayName)}"
          required minlength="2" maxlength="120" autocomplete="name">
      </label>
      ${feedback()}<button class="btn btn-dark" type="submit">Guardar nombre</button>
    </form>
  </section>`;
}

function workspaceCard(space) {
  const editable = space.role === 'owner' || space.role === 'editor';
  return `<section class="admin-card">
    <h2>Tu espacio</h2>
    <p class="account-hint">${
      editable
        ? 'Cambiar el nombre se guarda para todo el equipo.'
        : 'Tu acceso de lectura permite consultar este espacio.'
    }</p>
    ${
      editable
        ? `
      <form data-account-form="workspace" class="account-form">
        <label for="workspace-name">Nombre del espacio
          <input id="workspace-name" name="name" value="${esc(space.name)}" required maxlength="120">
        </label>
        ${feedback()}<button class="btn btn-dark" type="submit">Guardar espacio</button>
      </form>`
        : `<strong>${esc(space.name)}</strong>`
    }
  </section>`;
}

function memberRow(member) {
  return `<tr>
    <td>${esc(member.displayName)}</td><td>${esc(member.email)}</td>
    <td><select data-account-role="${esc(member.userId)}" data-current-role="${esc(member.role)}"
      aria-label="Permiso de ${esc(member.displayName)}">
      <option value="editor" ${member.role === 'editor' ? 'selected' : ''}>Editor</option>
      <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Lectura</option>
    </select></td>
    <td><button class="btn btn-plain" data-account-action="remove-member"
      data-user-id="${esc(member.userId)}" data-name="${esc(member.displayName)}">Quitar acceso</button></td>
  </tr>`;
}

function membersTable(account, user) {
  if (account.membersStatus === 'loading') return '<p role="status">Cargando accesos…</p>';
  if (account.membersStatus === 'error')
    return `
    <p class="form-error" role="alert">${esc(account.membersError)}</p>
    <button class="btn btn-plain" data-account-action="reload-members">Volver a intentar</button>`;
  if (account.membersStatus !== 'ready')
    return `
    <p>Elegí volver a cargar los accesos.</p>
    <button class="btn btn-plain" data-account-action="reload-members">Cargar accesos</button>`;
  return `<div class="table-scroll"><table>
    <thead><tr><th>Persona</th><th>Correo</th><th>Permiso</th><th>Acceso</th></tr></thead>
    <tbody>
      <tr><td><span class="table-name"><span class="profile-avatar">${esc(initials(user.displayName))}</span>
        ${esc(user.displayName)}</span></td><td>${esc(user.email)}</td>
        <td>${pill('Propietario')}</td><td>Acceso completo</td></tr>
      ${account.members.map(memberRow).join('')}
    </tbody>
  </table></div>${!account.members.length ? '<p class="account-hint">Todavía no agregaste colaboradores.</p>' : ''}`;
}

function collaboratorsCard(account, user) {
  return `<section class="admin-card account-members">
    <div class="admin-card-heading"><div><h2>Personas y permisos</h2>
      <p>Hasta tres colaboradores, además del propietario.</p></div>${pill(`${account.members.length} / 3`)}</div>
    ${membersTable(account, user)}
    <div class="account-member-add">
      <h3>Sumar una persona</h3>
      <p>La persona necesita una cuenta de Ensambla. Ingresá el correo con el que se registró.</p>
      <form data-account-form="member" class="account-form">
        <div class="account-member-fields">
          <label for="member-email">Correo electrónico
            <input id="member-email" name="email" type="email" required maxlength="254" autocomplete="off">
          </label>
          <label for="member-role">Permiso<select id="member-role" name="role">
            <option value="editor">Editor</option><option value="viewer">Lectura</option>
          </select></label>
        </div>
        ${feedback()}
        <button type="submit" class="btn btn-dark" ${account.members.length >= 3 ? 'disabled' : ''}>
          ${icon('plus', 18)} Agregar acceso
        </button>
      </form>
    </div>
    <p class="account-hint">Editor: puede modificar el espacio. Lectura: puede consultar. Sólo vos administrás los accesos.</p>
  </section>`;
}

function passwordCard() {
  return `<section class="admin-card">
    <h2>Cambiar contraseña</h2><p>Al cambiarla, se cierran las sesiones de todos tus equipos.</p>
    <form data-account-form="password" class="account-form">
      <label for="current-password">Contraseña actual
        <input id="current-password" name="currentPassword" type="password" autocomplete="current-password" required maxlength="128">
      </label>
      <label for="new-password">Nueva contraseña
        <input id="new-password" name="newPassword" type="password" autocomplete="new-password"
          required minlength="15" maxlength="128" aria-describedby="new-password-hint">
      </label>
      <p id="new-password-hint" class="account-hint">Entre 15 y 128 caracteres.</p>
      ${feedback()}<button class="btn btn-dark" type="submit">Actualizar contraseña</button>
    </form>
  </section>`;
}

function sessionsCard(owner) {
  return `<section class="admin-card account-security">
    <span class="bento-icon">${icon('shield', 25)}</span><h2>Tus sesiones</h2>
    <p>Si entraste desde otro equipo, podés cerrar todos sus accesos de una vez.</p>
    <button class="btn btn-plain" data-account-action="logout-all">Cerrar todas las sesiones</button>
    ${
      owner
        ? `<div class="account-backup">
      <h3>Una copia de tus ideas</h3><p>Los borradores de aplicaciones siguen guardados en este navegador.</p>
      <button class="btn btn-plain" data-action="export-backup">Exportar copia</button>
      <label class="btn btn-plain file-button">Restaurar copia
        <input id="backup-upload" type="file" accept="application/json,.json" hidden>
      </label>
    </div>`
        : ''
    }
  </section>`;
}

export function administration(account) {
  const space = account.workspaces.find((w) => w.id === account.activeWorkspaceId),
    user = account.user;
  if (!space || !user) return accountWaiting();
  const owner = space.role === 'owner';
  return `<main id="main" class="workspace-main">
    <div class="welcome-heading"><div>
      <span class="eyebrow">CADA PERSONA, SU ACCESO</span><h1>Tu cuenta y tu espacio<span class="brand-dot">.</span></h1>
      <p>${esc(space.name)} · ${roleLabels[space.role]}</p>
    </div>${pill(roleLabels[space.role], owner ? 'success' : 'neutral')}</div>
    <div class="account-admin-grid">${profileCard(user)}${workspaceCard(space)}</div>
    ${
      owner
        ? collaboratorsCard(account, user)
        : `<section class="admin-card">
      <h2>Accesos del equipo</h2><p>El propietario administra colaboradores y permisos.
      Tu permiso actual es de ${roleLabels[space.role].toLowerCase()}.</p>
    </section>`
    }
    <div class="account-admin-grid">${passwordCard()}${sessionsCard(owner)}</div>
  </main>`;
}
