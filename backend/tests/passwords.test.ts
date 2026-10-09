/** Comprueba hashes con sal distinta y comparación de contraseñas exactas,
 * incluyendo espacios, Unicode y hashes no reconocidos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/modules/auth/passwords.js';
import { passwordInput } from '../src/modules/auth/validation.js';

test('scrypt genera hashes diferentes y verifica sin alterar la contraseña', async () => {
  const password = '  Mi contraseña con ñ y espacios  ';
  const one = await hashPassword(password);
  const two = await hashPassword(password);
  assert.notEqual(one, two);
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword(password.trim(), one), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(await verifyPassword(password, 'scrypt$999999999$8$1$bad'), false);
  assert.equal(passwordInput(password), password);
  assert.throws(() => passwordInput('a'.repeat(129)));
});
