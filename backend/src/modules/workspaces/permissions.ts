/** Matriz única de permisos. El propietario administra accesos, el editor
 * modifica el espacio y el lector sólo consulta; se usa siempre en el servidor. */
import { ApiError } from '../../http/errors.js';
import type { WorkspaceRole } from '../auth/types.js';

export type Permission = 'read' | 'edit' | 'manage_members';
const allowed: Record<WorkspaceRole, readonly Permission[]> = {
  owner: ['read', 'edit', 'manage_members'],
  editor: ['read', 'edit'],
  viewer: ['read'],
};

export function requirePermission(role: WorkspaceRole, permission: Permission): void {
  if (!allowed[role].includes(permission)) {
    throw new ApiError(403, 'FORBIDDEN', 'Tu permiso no permite realizar esta acción.');
  }
}
