/** Estado de la cuenta en memoria. Consulta sesiones y espacios reales,
 * coordina sus cambios y avisa a la interfaz; no guarda cookies ni tokens en localStorage. */
import { createApiClient } from './api.js';

export function createAccountClient({ fetchFn, onChange = () => {} } = {}) {
  const state = {
    status: 'loading',
    user: null,
    workspaces: [],
    activeWorkspaceId: null,
    members: [],
    membersStatus: 'idle',
    membersError: '',
  };
  let revision = 0;
  const api = createApiClient({
    ...(fetchFn ? { fetchFn } : {}),
    onSessionExpired: () => loseSession(),
  });
  const activeWorkspace = () =>
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || null;
  function clearMembers() {
    state.members = [];
    state.membersStatus = 'idle';
    state.membersError = '';
  }
  function loseSession() {
    revision++;
    api.setCsrf('');
    Object.assign(state, { status: 'guest', user: null, workspaces: [], activeWorkspaceId: null });
    clearMembers();
    onChange(state);
  }
  function signature() {
    return JSON.stringify([state.status, state.user, state.workspaces, state.activeWorkspaceId]);
  }

  async function refresh() {
    const previous = signature(),
      run = ++revision;
    try {
      const session = await api.request('/api/auth/session');
      if (run !== revision) return;
      if (!session.user) {
        loseSession();
        return;
      }
      api.setCsrf(session.csrfToken);
      const result = await api.request('/api/workspaces');
      if (run !== revision) return;
      const oldSpace = state.activeWorkspaceId;
      Object.assign(state, {
        status: 'authenticated',
        user: session.user,
        workspaces: result.workspaces,
      });
      if (!state.workspaces.some((w) => w.id === oldSpace))
        state.activeWorkspaceId = state.workspaces[0]?.id ?? null;
      if (state.activeWorkspaceId !== oldSpace || activeWorkspace()?.role !== 'owner')
        clearMembers();
      if (signature() !== previous) onChange(state);
    } catch (error) {
      if (run !== revision) return;
      if (error.code === 'SESSION_REQUIRED') {
        loseSession();
        return;
      }
      state.status = 'unavailable';
      onChange(state);
    }
  }

  async function acceptSession(result) {
    const run = ++revision;
    api.setCsrf(result.csrfToken);
    let spaces;
    try {
      spaces = await api.request('/api/workspaces');
    } catch (error) {
      if (run !== revision) return;
      // La cuenta ya quedó conectada. Reintentar la sesión evita repetir un registro exitoso.
      Object.assign(state, {
        status: 'unavailable',
        user: result.user,
        workspaces: [],
        activeWorkspaceId: null,
      });
      clearMembers();
      onChange(state);
      throw error;
    }
    if (run !== revision) return;
    Object.assign(state, {
      status: 'authenticated',
      user: result.user,
      workspaces: spaces.workspaces,
      activeWorkspaceId: spaces.workspaces[0]?.id ?? null,
    });
    clearMembers();
    onChange(state);
  }

  async function loadMembers() {
    const space = activeWorkspace();
    if (state.status !== 'authenticated' || space?.role !== 'owner') {
      clearMembers();
      return;
    }
    state.membersStatus = 'loading';
    state.membersError = '';
    onChange(state);
    try {
      const result = await api.request(`/api/workspaces/${space.id}/members`);
      if (state.activeWorkspaceId !== space.id) return;
      state.members = result.members;
      state.membersStatus = 'ready';
      onChange(state);
    } catch (error) {
      if (state.activeWorkspaceId !== space.id) return;
      state.membersStatus = 'error';
      state.membersError = error.message;
      onChange(state);
    }
  }

  async function memberMutation(path, method, body) {
    const space = activeWorkspace();
    if (!space) throw new Error('Elegí un espacio para continuar.');
    await api.request(`/api/workspaces/${space.id}/members${path}`, { method, body });
    await loadMembers();
  }

  return {
    state,
    activeWorkspace,
    refresh,
    loadMembers,
    canEdit: () =>
      state.status === 'authenticated' && ['owner', 'editor'].includes(activeWorkspace()?.role),
    canManage: () => state.status === 'authenticated' && activeWorkspace()?.role === 'owner',
    async register(input) {
      await acceptSession(await api.request('/api/auth/register', { method: 'POST', body: input }));
    },
    async login(input) {
      await acceptSession(await api.request('/api/auth/login', { method: 'POST', body: input }));
    },
    async logout(all = false) {
      try {
        await api.request(`/api/auth/${all ? 'logout-all' : 'logout'}`, { method: 'POST' });
      } catch (error) {
        if (error.code !== 'SESSION_REQUIRED') throw error;
      }
      loseSession();
    },
    async updateProfile(displayName) {
      const result = await api.request('/api/auth/profile', {
        method: 'PATCH',
        body: { displayName },
      });
      state.user = result.user;
      onChange(state);
    },
    async changePassword(input) {
      await api.request('/api/auth/password', { method: 'POST', body: input });
      loseSession();
    },
    async renameWorkspace(name) {
      const space = activeWorkspace();
      if (!space) throw new Error('Elegí un espacio.');
      const result = await api.request(`/api/workspaces/${space.id}`, {
        method: 'PATCH',
        body: { name },
      });
      Object.assign(space, result.workspace);
      onChange(state);
    },
    selectWorkspace(id) {
      if (!state.workspaces.some((w) => w.id === id))
        throw new Error('No tenés acceso a ese espacio.');
      state.activeWorkspaceId = id;
      clearMembers();
      onChange(state);
    },
    addMember: (input) => memberMutation('', 'POST', input),
    changeRole: (id, role) => memberMutation(`/${encodeURIComponent(id)}`, 'PATCH', { role }),
    removeMember: (id) => memberMutation(`/${encodeURIComponent(id)}`, 'DELETE'),
  };
}
