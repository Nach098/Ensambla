/** Hashea y comprueba contraseñas con scrypt y sal aleatoria. Limita el
 * trabajo simultáneo para que el costo de seguridad no agote la memoria. */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../http/errors.js';

const COST = { N: 65_536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };
const PREFIX = 'scrypt$65536$8$2';
let running = 0;
const waiting: Array<() => void> = [];

async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (running >= 2) {
    if (waiting.length >= 8)
      throw new ApiError(
        503,
        'AUTH_BUSY',
        'Hay muchas solicitudes. Volvé a intentar en unos segundos.',
        5,
      );
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else {
    running++;
  }
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, COST, (error, key) => (error ? reject(error) : resolve(key)));
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${PREFIX}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const match = encoded?.match(/^scrypt\$65536\$8\$2\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{86})$/);
  // También calcula cuando el usuario/hash no existe: evita un atajo temporal evidente.
  const salt = match ? Buffer.from(match[1]!, 'base64url') : Buffer.alloc(16);
  const expected = match ? Buffer.from(match[2]!, 'base64url') : Buffer.alloc(64);
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected) && !!match;
}
