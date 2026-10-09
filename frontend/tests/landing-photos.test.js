/** Pruebas de integridad y carga de las fotos. Verifica comportamiento esperado y errores sin modificar datos de producción. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { landingPhotos } from '../public/landing-photos.js';
import { landing } from '../public/landing.js';

test('las fotos viajan completas con formato de imagen y aparecen sin carga diferida ni revelado oculto', () => {
  const html = landing();
  for (const [id, file] of [
    ['commerce', 'landing-comercio-v1.webp'],
    ['team', 'landing-equipo-v1.webp'],
  ]) {
    const uri = landingPhotos[id];
    assert.ok(uri.startsWith('data:image/webp;base64,'));
    const bytes = Buffer.from(uri.split(',')[1], 'base64');
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(
      bytes.equals(readFileSync(new URL(`../public/assets/${file}`, import.meta.url))),
      `La foto ${id} debe conservar el archivo optimizado completo.`,
    );
    const image = html.match(new RegExp(`<img[^>]*data-landing-photo="${id}"[^>]*>`))?.[0];
    assert.ok(image, `Falta la foto ${id}.`);
    assert.ok(image.includes(`src="${uri}"`));
    assert.match(image, /loading="eager"/);
    assert.match(image, /width="1200" height="800"/);
  }
  assert.doesNotMatch(html, /class="world-photo[^"]*" data-reveal/);
});
