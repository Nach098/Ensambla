/** Validadores compartidos para entradas de la API. Rechaza cuerpos,
 * campos e identificadores inesperados antes de llegar a los servicios. */
import { ApiError } from './errors.js';

export function objectInput(value: unknown, allowed: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  ) {
    throw new ApiError(400, 'INVALID_INPUT', 'La solicitud contiene campos no válidos.');
  }
  return value as Record<string, unknown>;
}

export function textInput(value: unknown, label: string, minimum = 1, maximum = 120): string {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ApiError(400, 'INVALID_INPUT', `${label} no es válido.`);
  }
  const text = value.trim();
  if (Array.from(text).length < minimum || Array.from(text).length > maximum) {
    throw new ApiError(
      400,
      'INVALID_INPUT',
      `${label} debe tener entre ${minimum} y ${maximum} caracteres.`,
    );
  }
  return text;
}

export function emailInput(value: unknown): string {
  const email = textInput(value, 'El correo', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'INVALID_INPUT', 'Ingresá un correo válido.');
  }
  return email;
}

export function uuidInput(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ApiError(404, 'NOT_FOUND', 'El recurso no existe.');
  }
  return value;
}
