/** Entradas de registro, acceso y cambio de contraseña. Mantiene las reglas
 * en el servidor y evita tomar roles o propietarios enviados por el cliente. */
import { ApiError } from '../../http/errors.js';
import { emailInput, objectInput, textInput } from '../../http/validation.js';
import type { LoginInput, RegisterInput } from './types.js';

export function passwordInput(value: unknown, newPassword = true): string {
  const minimum = newPassword ? 15 : 1;
  if (
    typeof value !== 'string' ||
    Array.from(value).length < minimum ||
    Array.from(value).length > 128 ||
    Buffer.byteLength(value, 'utf8') > 512 ||
    value.includes('\0')
  ) {
    throw new ApiError(
      400,
      'INVALID_PASSWORD',
      `La contraseña debe tener entre ${minimum} y 128 caracteres.`,
    );
  }
  // No recortar ni normalizar: los espacios pueden formar parte de una contraseña.
  return value;
}

export function registerInput(value: unknown): RegisterInput {
  const body = objectInput(value, ['email', 'displayName', 'password', 'workspaceName']);
  const displayName = textInput(body.displayName, 'El nombre', 2);
  return {
    email: emailInput(body.email),
    displayName,
    password: passwordInput(body.password),
    workspaceName:
      body.workspaceName === undefined
        ? `Espacio de ${displayName}`.slice(0, 120)
        : textInput(body.workspaceName, 'El nombre del espacio'),
  };
}

export function loginInput(value: unknown): LoginInput {
  const body = objectInput(value, ['email', 'password']);
  return { email: emailInput(body.email), password: passwordInput(body.password, false) };
}

export function passwordChangeInput(value: unknown): {
  currentPassword: string;
  newPassword: string;
} {
  const body = objectInput(value, ['currentPassword', 'newPassword']);
  const currentPassword = passwordInput(body.currentPassword, false);
  const newPassword = passwordInput(body.newPassword);
  if (currentPassword === newPassword)
    throw new ApiError(400, 'SAME_PASSWORD', 'Elegí una contraseña distinta de la actual.');
  return { currentPassword, newPassword };
}
