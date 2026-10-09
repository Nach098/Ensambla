import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const directory = fileURLToPath(new URL('../frontend/public/', import.meta.url));
const files = (await readdir(directory)).filter(name => name.endsWith('.js'));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(directory, file)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
JSON.parse(await readFile(join(directory, 'manifest.webmanifest'), 'utf8'));
console.log(`${files.length} módulos de frontend y manifiesto verificados.`);
