# Cómo leer el código

Los archivos de código empiezan con un comentario breve en español: qué hacen, con qué parte se relacionan y para qué existen. Los nombres de variables y tipos siguen el estilo inglés usado en las APIs; los comentarios y mensajes están en español.

## Empezar por el backend

| Archivo                                         | Qué explica                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `backend/src/server.ts`                         | Arranque, PostgreSQL y cierre del proceso.                       |
| `backend/src/http/app.ts`                       | Montaje de rutas, seguridad HTTP, archivos públicos y errores.   |
| `backend/src/config.ts`                         | Variables del servidor y origen público.                         |
| `backend/src/modules/auth/routes.ts`            | URLs y respuesta HTTP de registro, ingreso, perfil y contraseña. |
| `backend/src/modules/auth/validation.ts`        | Campos admitidos y reglas de entrada.                            |
| `backend/src/modules/auth/service.ts`           | Pasos para registrar, entrar y cambiar la contraseña.            |
| `backend/src/modules/auth/repository.ts`        | Consultas de cuentas: la parte que habla SQL.                    |
| `backend/src/modules/auth/passwords.ts`         | Hash y comprobación de contraseñas.                              |
| `backend/src/modules/auth/sessions.ts`          | Emisión, caducidad y revocación de sesiones.                     |
| `backend/src/modules/auth/middleware.ts`        | Lectura de cookie, usuario autenticado y control CSRF.           |
| `backend/src/modules/auth/rate-limiter.ts`      | Contadores de intentos compartidos por los servidores.           |
| `backend/src/modules/workspaces/permissions.ts` | Matriz pequeña de propietario/editor/lectura.                    |
| `backend/src/modules/workspaces/service.ts`     | Acceso al espacio y cambios de colaboradores en transacciones.   |
| `backend/src/modules/workspaces/repository.ts`  | Consultas de espacios y miembros.                                |
| `backend/src/database/database.ts`              | Conexión reservada durante una transacción.                      |
| `database/migrations/002_authentication.sql`    | Tablas añadidas para sesiones e intentos.                        |

`routes` recibe HTTP, `validation` valida, `service` coordina el caso de uso y `repository` guarda o consulta datos. Los servicios no dependen de Express; se prueban con una base real o PostgreSQL en WASM.

### Ejemplo: iniciar sesión

1. El navegador envía `POST /api/auth/login` desde `frontend/public/api.js`.
2. `http/security.ts` comprueba el origen y el formato. `auth/routes.ts` limita intentos y valida los campos.
3. `AuthService.login()` busca la cuenta mediante `AccountRepository` y compara la contraseña con `verifyPassword()`.
4. En una transacción se comprueba otra vez la cuenta, se revoca la sesión anterior y `SessionService.issue()` crea una nueva.
5. `sendSession()` coloca la cookie protegida; el JSON devuelve usuario y token CSRF, nunca la contraseña ni el token de la cookie.

Para seguir una operación de colaboradores, empezar en `workspaces/routes.ts`, pasar a `WorkspaceService` y luego a su repositorio. La función `locked()` concentra el bloqueo y la nueva comprobación de permisos.

## Seguir por la interfaz

| Archivo                               | Responsabilidad                                                 |
| ------------------------------------- | --------------------------------------------------------------- |
| `frontend/public/api.js`              | Solicitudes HTTP y errores; mantiene el CSRF en memoria.        |
| `frontend/public/account-client.js`   | Cuenta activa, espacios, colaboradores y llamadas a la API.     |
| `frontend/public/account-views.js`    | HTML de formularios y tarjetas de cuenta, dividido por sección. |
| `frontend/public/account-controls.js` | Clics, envíos, carga y errores de esos formularios.             |
| `frontend/public/account.css`         | Estilos de registro, ingreso y accesos.                         |
| `frontend/public/app.js`              | Conecta cuenta, navegación, constructor y estado local.         |
| `frontend/public/store.js`            | Borradores separados por cuenta/espacio.                        |
| `frontend/public/domain.js`           | Plantillas y reglas locales del constructor actual.             |
| `frontend/public/pages.js`            | Barra lateral, espacio y guía. Ya no permite simular otro rol.  |

La interfaz presenta permisos; el servidor los impone. Esa distinción importa: cambiar JavaScript desde las herramientas del navegador no concede acceso a los endpoints.

## Pruebas y formato

`backend/tests/authentication.test.ts` prueba solicitudes HTTP contra la base aislada: registro, acceso, cookies, CSRF, revocación, roles y solicitudes concurrentes. `frontend/tests/accounts.test.js` comprueba cliente, formularios y borradores separados. Las pruebas existentes de bloques y animaciones se conservan.

```bash
npm run check
npm test
npm run build
npm run format:check
```

`npm run format` aplica Prettier con la configuración del proyecto. La versión queda fijada y CI comprueba el formato. Se excluyen recursos binarios, fotos embebidas, documentación histórica y archivos generados.

## Archivos sin comentarios internos

JSON estricto no admite comentarios. Los `package.json` tienen un campo `description`. Los demás se explican aquí:

| Archivo                                | Uso                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| `backend/tsconfig.json`                | Reglas de TypeScript y salida del backend.            |
| `backend/tsconfig.test.json`           | Comprobación de tipos de las pruebas.                 |
| `.prettierrc.json`                     | Estilo automático del código.                         |
| `frontend/public/manifest.webmanifest` | Nombre, icono y arranque de la aplicación instalable. |
| `package-lock.json`                    | Versiones exactas de dependencias; lo genera npm.     |
| `.nvmrc`                               | Versión de Node usada en desarrollo y CI.             |

La migración `001_core.sql` ya tiene su introducción y se conserva byte por byte: editar una migración aplicada rompería su checksum.
