import { fileURLToPath } from 'node:url';

export interface Config {
  environment: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
  trustProxy: boolean;
  frontendPath: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const environment = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(environment)) {
    throw new Error('NODE_ENV debe ser development, test o production.');
  }
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un puerto válido.');
  }
  if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL. Consultá .env.example.');
  let url: URL;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new Error('DATABASE_URL debe ser una URL de PostgreSQL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname === '/') {
    throw new Error('DATABASE_URL debe incluir servidor y nombre de base PostgreSQL.');
  }
  const trustProxy = env.TRUST_PROXY ?? 'false';
  if (!['true', 'false'].includes(trustProxy)) throw new Error('TRUST_PROXY debe ser true o false.');
  return {
    environment: environment as Config['environment'],
    host: env.HOST ?? '0.0.0.0',
    port,
    databaseUrl: env.DATABASE_URL,
    trustProxy: trustProxy === 'true',
    frontendPath: fileURLToPath(new URL('../../frontend/public/', import.meta.url)),
  };
}
