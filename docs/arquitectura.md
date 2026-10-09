# Arquitectura de Ensambla

## Decisión inicial

Un monorepo con dos espacios npm: frontend estático modular y backend Node.js 24 + TypeScript + Express. PostgreSQL 17 guarda cuentas, espacios y aplicaciones. Docker empaqueta el servidor y la interfaz juntos. No se introduce React ni otro framework para conservar el trabajo actual; se puede adoptar más adelante si la complejidad del editor lo justifica.

El navegador se comunica exclusivamente con `/api` del mismo origen. Las credenciales de base, pago, correo y servicios externos pertenecen al servidor. No se publican variables de entorno en el frontend.

## Modelo inicial

| Tabla               | Responsabilidad                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| `users`             | Cuenta, perfil, hash de contraseña y estado de habilitación.           |
| `workspaces`        | Espacio del propietario; `owner_id` determina la propiedad.            |
| `workspace_members` | Colaboradores con rol editor o lector.                                 |
| `applications`      | Aplicación, estado, revisión y definición de pantallas/bloques/reglas. |
| `app_collections`   | Tablas lógicas de cada aplicación y sus campos.                        |
| `app_records`       | Registros de cada tabla lógica, con datos JSONB y revisión.            |
| `schema_migrations` | Archivos SQL aplicados, fecha y checksum.                              |

`app_collections.fields` será la fuente de verdad para los campos. La definición de una aplicación referenciará las colecciones por identificador y contendrá presentación y reglas, sin duplicar sus registros. JSONB permite distintas estructuras por aplicación; la API deberá validar esos documentos según un esquema versionado. Un objeto JSON no equivale a datos ya validados.

Las claves foráneas compuestas impiden que un registro se vincule a una colección de otro espacio. Esto no reemplaza la autorización: cada lectura y escritura deberá verificar el usuario, el espacio y el permiso. Los endpoints de cuentas y espacios tienen autorización real. Los endpoints de aplicaciones y registros aún están pendientes; no se habilitan sin la misma protección.

## Organización del backend al crecer

Agregar cada función real en `backend/src/modules/<funcion>/`, por ejemplo `auth`, `workspaces`, `applications`, `records` o `licensing`. Cada módulo contendrá sus rutas, validación, servicio y consultas según lo necesite; no crear capas vacías ni servicios separados anticipadamente.

Las reglas del constructor serán declarativas y con acciones permitidas. No ejecutar JavaScript, SQL ni expresiones arbitrarias suministradas por usuarios. Las operaciones como confirmar un pedido y descontar existencias deberán ocurrir en una única transacción, con control de concurrencia e idempotencia en el servidor.

Al conectar la interfaz, reemplazar gradualmente la persistencia central de `frontend/public/store.js` por un adaptador de API. Mantener el modelo y las funciones puras actuales cuando sean útiles. La validación del navegador mejora la experiencia; el servidor vuelve a validar siempre.

## Infraestructura ya implementada

- `/api/health/live` confirma que el proceso HTTP responde.
- `/api/health/ready` comprueba conexión y correspondencia exacta de las migraciones.
- Las migraciones reservan una conexión, usan bloqueo de PostgreSQL y transacción por archivo. Un checksum detecta modificaciones posteriores.
- Errores HTTP genéricos e identificadores de solicitud; los logs no incluyen cuerpos, tokens ni parámetros de consulta.
- Cabeceras Helmet, límites de JSON, configuración validada y cierre ordenado al recibir SIGTERM/SIGINT.
- Imagen ejecutada como usuario sin privilegios y PostgreSQL local con volumen persistente.

La CSP permite estilos inline porque el constructor actual calcula estilos y colores desde JavaScript. Los scripts sólo se cargan desde el propio origen. Al incorporar integraciones o autenticación se revisarán estas reglas con pruebas de navegador.

## Uso offline y licencias

El service worker guarda recursos de la interfaz. No intercepta `/api`, solicitudes con `Authorization` ni guarda respuestas marcadas `private` o `no-store`. Esto prepara la separación de la interfaz offline y el estado real de la cuenta; no implementa licencias.

El diseño previsto es una autorización firmada por el servidor, de duración limitada —inicialmente hasta 72 horas, sin superar el vencimiento de prueba o suscripción—, con renovación al reconectar. El servidor será la autoridad del tiempo, los pagos y la vigencia; el navegador no podrá renovar ese permiso por sí solo.

Sin conexión no puede conocerse inmediatamente una revocación y no puede garantizarse inviolabilidad de un cliente controlado por el usuario. Si se necesita control estricto, determinadas operaciones deberán exigir conexión. Antes de implementar, definir qué se conserva en lectura/exportación al vencer, qué operaciones funcionan offline y cómo se sincronizan los cambios sin duplicar pedidos ni movimientos de stock.

La migración `002_authentication.sql` incorpora sesiones y contadores de intentos. Invitaciones por correo, auditoría, suscripciones, dispositivos, permisos offline firmados y sincronización se añadirán con nuevas migraciones al implementarse.
