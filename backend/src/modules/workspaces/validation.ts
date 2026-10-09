/** Valida cambios de espacio y colaboradores. Sólo admite editor o lector;
 * la propiedad nunca se concede mediante un campo enviado desde la interfaz. */
import { ApiError } from '../../http/errors.js';
import { emailInput, objectInput, textInput } from '../../http/validation.js';

export type MemberRole = 'editor' | 'viewer';
export function memberRole(value: unknown): MemberRole {
  if (value !== 'editor' && value !== 'viewer')
    throw new ApiError(400, 'INVALID_ROLE', 'Elegí editor o lectura.');
  return value;
}
export function newMemberInput(value: unknown): { email: string; role: MemberRole } {
  const body = objectInput(value, ['email', 'role']);
  return { email: emailInput(body.email), role: memberRole(body.role) };
}
export function roleChangeInput(value: unknown): MemberRole {
  return memberRole(objectInput(value, ['role']).role);
}
export function workspaceNameInput(value: unknown): string {
  return textInput(objectInput(value, ['name']).name, 'El nombre del espacio');
}
