# Cuentas, sesiones y permisos

Esta etapa implementa cuentas y accesos reales en PostgreSQL. Las aplicaciones del constructor todavía son borradores locales: no se están compartiendo sus registros por servidor.

## Recorrido

1. En la landing, elegir construir o entrar al espacio. Si no hay sesión, se muestra registro o ingreso.
2. Registrar nombre, correo, contraseña y nombre del espacio. La cuenta y su espacio se crean juntos en una transacción; la cuenta se convierte en propietaria de ese espacio.
3. Entrar en **Cuenta y accesos** para editar el perfil, cambiar el nombre del espacio, modificar la contraseña o cerrar sesiones.
4. Para sumar un colaborador, esa persona debe haber creado su cuenta. El propietario escribe su correo y elige editor o lectura. No se envían correos ni invitaciones ficticias.
5. El colaborador inicia sesión con su propia contraseña y selecciona el espacio compartido desde la barra lateral.

Cada cuenta tiene su espacio propio y puede colaborar en otros. El límite actual es de tres colaboradores por espacio, además del propietario.

## Qué permite cada rol

| Operación actual                                  | Propietario | Editor | Lectura           |
| ------------------------------------------------- | ----------- | ------ | ----------------- |
| Consultar su espacio                              | Sí          | Sí     | Sí                |
| Cambiar el nombre del espacio                     | Sí          | Sí     | No                |
| Listar y administrar colaboradores                | Sí          | No     | No                |
| Cambiar el rol de otra persona                    | Sí          | No     | No                |
| Quitar accesos                                    | Sí          | No     | No                |
| Editar su propio perfil/contraseña                | Sí          | Sí     | Sí                |
| Editar borradores del constructor en su navegador | Sí          | Sí     | No en la interfaz |

El servidor calcula el rol desde `workspaces.owner_id` y `workspace_members`; ignora cualquier rol del navegador. Si se quita un acceso, la siguiente solicitud a ese espacio se rechaza. El límite de tres se verifica dentro de una transacción que bloquea la fila del espacio, también ante solicitudes simultáneas.

Los permisos de datos y aplicaciones compartidas se incorporarán al crear sus endpoints. Ocultar botones en el constructor no protege archivos de `localStorage` frente a alguien que controla físicamente ese navegador.

## Contraseñas

Se aceptan frases de 15 a 128 caracteres, sin recortar espacios ni imponer combinaciones arbitrarias. El servidor aplica scrypt asíncrono con sal aleatoria, costo N=65536/r=8/p=2 y límite de memoria. Dos tareas simultáneas y una cola acotada evitan agotar la memoria con solicitudes de hash. Se compara el resultado en tiempo constante y se calcula también ante un correo inexistente.

Cambiar la contraseña exige conocer la actual y revoca todas las sesiones. El registro no crea una cuenta de ejemplo ni incluye claves predeterminadas.

## Sesiones

Un token aleatorio de 256 bits identifica la sesión. La base guarda su SHA-256, no el token utilizable. La cookie es `HttpOnly`, `SameSite=Lax`, sin dominio y con ruta `/`; en producción lleva `Secure` y el prefijo `__Host-`.

Las sesiones vencen a los siete días y dejan de funcionar después de doce horas sin solicitudes autenticadas. La actividad renueva el tiempo de inactividad, nunca el vencimiento absoluto. El acceso genera una sesión nueva y revoca la cookie anterior del mismo navegador. Hay cierre del equipo actual y de todos los equipos.

El token CSRF se obtiene al consultar la sesión y se mantiene sólo en memoria. Las escrituras exigen ese token, JSON, una cabecera de Ensambla y el origen definido en `APP_ORIGIN`. Registro e ingreso, que todavía no tienen sesión, también exigen JSON, cabecera y origen. No se aceptan orígenes ausentes o `null` sin un `Referer` válido del mismo origen.

Los intentos de registro/acceso tienen límites persistentes por IP y por correo; se responde `429` con `Retry-After`. Una cola de hashes saturada devuelve `503`. Los errores públicos no contienen SQL, contraseñas ni tokens. Los límites reducen abuso; no sustituyen controles de tráfico del servidor/proxy ante ataques distribuidos.

## Configuración

En desarrollo: `APP_ORIGIN=http://localhost:3000`. Si se entra por `127.0.0.1`, otro puerto o una IP de la red, usar exactamente ese origen en `.env`/Compose. En producción es obligatorio un dominio HTTPS, por ejemplo `https://ensambla.example`.

Aplicar la nueva migración y arrancar:

```bash
npm ci
npm run db:migrate
npm run dev
```

Para el entorno completo con Docker: `docker compose up --build -d`. El comando de mantenimiento `npm run db:cleanup-auth` elimina sesiones y contadores caducados. Después de compilar, usar `npm run db:cleanup-auth:production`; su frecuencia se configura al elegir el servidor.

## Borradores y modo offline

Cada borrador se guarda con una clave que combina cuenta y espacio. La maqueta anterior, `ensambla.demo.v1`, permanece intacta y no se importa automáticamente. Un mismo espacio abierto desde cuentas o equipos distintos todavía no comparte borradores ni datos.

La API de cuentas y permisos nunca pasa por la caché offline. Si no puede verificarse la sesión, se pide reconectar y se conserva lo guardado. Los permisos de suscripción offline firmados siguen pendientes; una cookie de sesión no es una licencia de uso.

## Límites de esta etapa

La recuperación de contraseña olvidada y la verificación del correo requieren un proveedor de correo y no están habilitadas. El correo de registro identifica una cuenta; todavía no prueba propiedad de una casilla. Antes de un registro público y de compartir datos reales de negocio, implementar verificación/invitaciones confirmadas y recuperación, además de la API de aplicaciones con autorización.

Esta versión corre al levantar el proyecto del repositorio. La maqueta histórica publicada en Sites sigue siendo independiente.
