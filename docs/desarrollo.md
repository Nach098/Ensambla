# Desarrollo

## Primera instalación

Usar Node 24 y `npm ci` desde la raíz; `package-lock.json` fija las dependencias. Copiar `.env.example` a `.env`. Iniciar PostgreSQL, ejecutar `npm run db:migrate` y luego `npm run dev`. La interfaz y la API se sirven desde http://localhost:3000.

El flujo completo con Docker se encuentra en el README. Cambiar el password local también exige ajustar `DATABASE_URL`. Compose inicializa credenciales únicamente al crear el volumen; editarlas en `.env` no modifica un volumen existente.

## Cambios y verificaciones

Trabajar en ramas pequeñas y describir el comportamiento cambiado. Antes de integrar código:

```bash
npm run check
npm test
npm run build
```

En cambios visuales, revisar además la interfaz en PC y móvil, teclado, foco, tamaños de texto, movimiento reducido y los formularios existentes. No borrar `localStorage` para hacer que una modificación parezca funcionar.

## Base de datos

Crear el siguiente archivo numerado en `database/migrations/`, por ejemplo `002_sessions.sql`. No cambiar archivos ya aplicados. No colocar `BEGIN`/`COMMIT` en el archivo; el ejecutor controla la transacción. Las migraciones actuales son transaccionales; operaciones incompatibles con una transacción, como `CREATE INDEX CONCURRENTLY`, requieren adaptar primero el ejecutor.

No se ejecutan migraciones automáticamente al arrancar el servidor. En desarrollo se aplican con el comando; Compose local usa un servicio de migración separado. Producción usa un paso de publicación explícito.

Para probar contra un PostgreSQL de servidor, definir `TEST_DATABASE_URL` con una base exclusivamente de pruebas. Las pruebas crean y eliminan esquemas temporales, sin truncar tablas existentes. Para probar la ruta de arranque real con Docker:

```bash
docker compose up --build -d
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health/ready
```

Un `503` en readiness suele indicar que no hay conexión, faltan migraciones o no corresponden a la versión del código. La respuesta pública no expone detalles privados de la base.

## Recursos actuales

La maqueta conserva HTML/CSS/JS y fotos locales. Los módulos se ejecutan como ESM nativo; abrir `index.html` con `file://` no funciona. Las fotos embebidas de `landing-photos.js` se conservan como estaban para evitar perder la solución de carga actual; el servidor nuevo también sirve correctamente WebP desde `assets/`.

La configuración de negocio sigue siendo local hasta integrar la API. No ingresar datos sensibles ni cuentas reales en los formularios simulados. Una migración futura de datos locales deberá ser explícita, con vista previa y validación.
