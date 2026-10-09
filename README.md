# Ensambla

Tu sistema, un bloque a la vez. Plataforma para construir aplicaciones internas con tablas, formularios, pantallas y reglas adaptadas a cada negocio, equipo o proyecto.

Este repositorio es la base de desarrollo del producto de Ignacio. Conserva la landing y el constructor actuales e incorpora un servidor TypeScript, PostgreSQL, migraciones, pruebas y una ruta de despliegue con Docker.

## Estado actual

- La interfaz funciona con sus plantillas, bloques, categorías, filtros, animaciones y datos en `localStorage`.
- El servidor sirve esa interfaz y expone comprobaciones de disponibilidad en `/api/health/live` y `/api/health/ready`.
- PostgreSQL tiene un esquema inicial y migraciones versionadas. La interfaz todavía no guarda sus datos en esa base.
- Las cuentas, permisos, suscripciones, licencias offline e integraciones visibles en la maqueta todavía no son servicios reales.

Es una base ejecutable para continuar el desarrollo, no un producto completo habilitado para recibir datos de clientes. El orden de implementación está en [docs/roadmap.md](docs/roadmap.md).

## Arrancar con Docker

Requiere Git, Docker y Docker Compose v2.

```bash
git clone https://github.com/Nach098/Ensambla.git
cd Ensambla
docker compose up --build -d
```

Abrir **http://localhost:3000**. Compose inicia PostgreSQL, espera su disponibilidad, aplica las migraciones y levanta el servidor. Los datos de PostgreSQL quedan en un volumen. Las credenciales predeterminadas de este comando son exclusivamente locales.

```bash
docker compose logs -f app
docker compose down
```

`down` conserva el volumen. No usar `down -v` si se quieren conservar los datos.

## Desarrollar con Node.js

Requiere Node.js 24 y PostgreSQL 17. Con Docker se puede iniciar sólo la base:

```bash
cp .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
npm run dev
```

En PowerShell, reemplazar el primer comando por `Copy-Item .env.example .env`. Si PostgreSQL está instalado por separado, ajustar `DATABASE_URL` en `.env` y omitir el comando de Docker. Nunca subir `.env` ni contraseñas.

El backend se reinicia al editar TypeScript. El frontend no necesita compilarse: se editan sus archivos y se recarga el navegador. Se mantiene HTML, CSS y JavaScript modular; TypeScript ya está incorporado donde corre la API.

## Estructura

| Carpeta o archivo | Uso |
| --- | --- |
| `frontend/public/` | Interfaz actual y recursos públicos. Es código fuente, no salida generada. |
| `frontend/tests/` | Pruebas de lógica, vistas, interacción y política de caché. |
| `backend/src/http/` | Aplicación Express, cabeceras, errores y endpoints iniciales. |
| `backend/src/database/` | Pool PostgreSQL, migraciones y comprobación del esquema. |
| `backend/src/config.ts` | Validación de configuración y rutas. |
| `backend/src/server.ts` | Arranque y cierre ordenado del servidor. |
| `backend/tests/` | Pruebas de HTTP, configuración y base de datos. |
| `database/migrations/` | Cambios SQL numerados; los archivos aplicados no se editan. |
| `docs/` | Arquitectura, desarrollo, despliegue y próximos pasos. |
| `docs/maqueta/` | Documentación histórica del prototipo. Sus referencias a `dist/` corresponden a aquella versión. |
| `.github/workflows/ci.yml` | Verificación automática con PostgreSQL y Docker en GitHub. |
| `Dockerfile` y `compose*.yaml` | Imagen del servidor, entorno local y configuración para despliegue. |

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000. |
| `npm run check` | Comprueba TypeScript, los módulos JavaScript y el manifiesto. |
| `npm test` | Pruebas de backend y frontend. |
| `npm run build` | Compila el backend a `backend/dist/`. |
| `npm start` | Ejecuta el backend compilado. |
| `npm run db:migrate` | Aplica migraciones desde TypeScript en desarrollo. |
| `npm run db:migrate:production` | Aplica migraciones usando el backend compilado. |

Sin `TEST_DATABASE_URL`, las pruebas SQL usan PGlite, un motor PostgreSQL en WASM sólo para pruebas locales. En CI se ejecutan contra un PostgreSQL de servidor, en un esquema temporal por prueba; no usar la base de producción para ejecutar pruebas.

## Camino a producción

La misma aplicación sirve la interfaz y la API desde un único origen. Las aplicaciones creadas por usuarios serán configuraciones y registros almacenados en PostgreSQL, interpretados por un motor compartido. No se despliega un servidor por cada negocio.

La imagen Docker funciona con una base PostgreSQL externa. El procedimiento de configuración, migración y despliegue está en [docs/despliegue.md](docs/despliegue.md). Antes de abrir el registro público, completar cuentas reales, autorización, persistencia, validación, licencias y recuperación de datos.

## Maqueta conservada

La rama `maqueta-v0.2.6` conserva el código original como punto de retorno. `main` contiene la estructura nueva. En esta reorganización se conserva la clave `ensambla.demo.v1` de `localStorage`; no se borra ni se importa automáticamente información del navegador.

El sitio previamente publicado en Sites sigue siendo una versión independiente. Este repositorio no modifica su publicación ni incluye sus identificadores de hosting.

## Licencias

Repositorio privado, sin una licencia de código abierto elegida para Ensambla. Las fuentes Plus Jakarta Sans conservan su licencia en `frontend/public/assets/OFL-PlusJakartaSans.txt`. Consultar [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) para recursos de terceros.
