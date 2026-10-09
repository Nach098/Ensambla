/** Eventos de los formularios de cuenta y accesos. Evita dobles envíos,
 * conserva campos ante errores y delega las solicitudes al cliente de cuenta. */
import { esc } from './ui.js';

export function bindAccountControls(
  client,
  { notify, onSignedIn, navigate, confirm, closeModal, error },
) {
  const busy = new WeakSet();
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-account-form]');
    if (!form) return;
    event.preventDefault();
    if (busy.has(form)) return;
    const values = Object.fromEntries(new FormData(form));
    const button = form.querySelector('[type="submit"]'),
      message = form.querySelector('[data-account-error]');
    message.hidden = true;
    busy.add(form);
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    const mode = form.dataset.accountForm;
    try {
      if (mode === 'register') {
        await client.register(values);
        onSignedIn();
        notify('Tu cuenta y tu espacio están listos.');
      } else if (mode === 'login') {
        await client.login(values);
        onSignedIn();
        notify('Ya estás en tu espacio.');
      } else if (mode === 'profile') {
        await client.updateProfile(values.displayName);
        notify('Nombre guardado.');
      } else if (mode === 'workspace') {
        await client.renameWorkspace(values.name);
        notify('Espacio actualizado.');
      } else if (mode === 'member') {
        await client.addMember(values);
        document.querySelector('[data-account-form="member"]')?.reset();
        notify('Acceso agregado.');
      } else if (mode === 'password') {
        await client.changePassword(values);
        navigate('ingresar');
        notify('Contraseña actualizada. Iniciá sesión con la nueva.');
      }
    } catch (failure) {
      if (form.isConnected) {
        message.textContent = failure.message;
        message.hidden = false;
      } else error(failure.message);
    } finally {
      busy.delete(form);
      form.removeAttribute('aria-busy');
      if (button && form.isConnected)
        button.disabled = mode === 'member' && client.state.members.length >= 3;
    }
  });
  document.addEventListener('change', async (event) => {
    const el = event.target;
    if (el.hasAttribute('data-account-workspace')) {
      try {
        client.selectWorkspace(el.value);
        navigate('espacio');
      } catch (failure) {
        error(failure.message);
      }
      return;
    }
    if (!el.hasAttribute('data-account-role')) return;
    const previous = el.dataset.currentRole;
    el.disabled = true;
    try {
      await client.changeRole(el.dataset.accountRole, el.value);
      notify('Permiso actualizado.');
    } catch (failure) {
      el.value = previous;
      error(failure.message);
    } finally {
      if (el.isConnected) el.disabled = false;
    }
  });
  document.addEventListener('click', async (event) => {
    const el = event.target.closest('[data-account-action]');
    if (!el || el.disabled) return;
    event.preventDefault();
    const action = el.dataset.accountAction;
    if (action === 'show-password') {
      const input = document.getElementById(el.dataset.input),
        show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      el.setAttribute('aria-pressed', String(show));
      return;
    }
    if (action === 'remove-member' || action === 'logout-all') {
      const title =
        action === 'remove-member'
          ? `Quitar acceso de ${el.dataset.name}`
          : 'Cerrar todas las sesiones';
      const copy =
        action === 'remove-member'
          ? 'Esta persona dejará de tener acceso a tu espacio.'
          : 'Se cerrará también la sesión de este equipo. Tus borradores guardados se conservan.';
      confirm(title, copy, async () => {
        if (action === 'remove-member') {
          await client.removeMember(el.dataset.userId);
          notify('Acceso quitado.');
        } else {
          await client.logout(true);
          navigate('ingresar');
          notify('Todas tus sesiones quedaron cerradas.');
        }
        closeModal();
      });
      return;
    }
    el.disabled = true;
    try {
      if (action === 'retry') await client.refresh();
      else if (action === 'reload-members') await client.loadMembers();
      else if (action === 'logout') {
        await client.logout();
        navigate('');
        notify('Sesión cerrada.');
      }
    } catch (failure) {
      error(failure.message);
    } finally {
      if (el.isConnected) el.disabled = false;
    }
  });
}

export function confirmationMarkup(title, copy) {
  return `<h2 id="modal-title">${esc(title)}</h2><p class="modal-intro">${esc(copy)}</p><p data-account-error class="form-error" role="alert" hidden></p><div class="modal-actions"><button class="btn btn-plain" data-action="close-modal">Cancelar</button><button class="btn btn-danger" data-action="confirm-account">Confirmar</button></div>`;
}
