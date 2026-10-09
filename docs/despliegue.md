# Despliegue

## Alcance

La infraestructura está preparada para ejecutar una versión de Ensambla en un servidor o entorno de pruebas. El registro público y el uso con datos de clientes dependen de completar las funciones de `roadmap.md`. No se ha contratado ni configurado un servidor de producción.

El diseño usa una imagen Docker para la interfaz/API, PostgreSQL externo y un proxy HTTPS. No es necesario generar ni alojar una aplicación separada por negocio.

## Preparar un entorno

1. Elegir un servidor con Docker o una plataforma que ejecute contenedores. Crear una base PostgreSQL 17, con usuario propio, copias de seguridad y conexión restringida al servidor.
2. Clonar el repositorio privado y elegir un commit verificado. No copiar `.git` ni secretos dentro de la imagen.
3. Copiar `.env.production.example` a `.env.production` y completar la URL real de base, el puerto local y el nombre de imagen. Codificar caracteres especiales del usuario/password en la URL. Usar la configuración TLS y los certificados requeridos por el proveedor; no desactivar la verificación de certificados.
4. Configurar el proxy HTTPS y DNS. El puerto de la aplicación se publica sólo en `127.0.0.1`. `TRUST_PROXY=true` supone exactamente un proxy confiable: si la topología cambia, revisar esa opción.

## Publicar una versión

Ejemplo desde una revisión elegida, usando `v0.3.0` como etiqueta local de imagen. Ajustar `ENSAMBLA_IMAGE=ensambla:v0.3.0` en `.env.production`.

```bash
npm ci
npm run check
npm test
npm run build
docker build -t ensambla:v0.3.0 .
docker compose --env-file .env.production -f compose.production.yaml config --quiet
```

Antes de cambios de base, verificar una copia de seguridad y la compatibilidad de la migración con la versión aún en ejecución. Aplicar el esquema y después iniciar la aplicación:

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate
docker compose --env-file .env.production -f compose.production.yaml up -d app
curl --fail http://127.0.0.1:3000/api/health/ready
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 app
```

No continuar si el comando de migración falla. Ajustar el puerto del `curl` si se cambió `APP_PORT`. Verificar también la URL HTTPS pública, las imágenes, el constructor y el comportamiento del service worker. El primer despliegue real necesita esa validación en el entorno elegido.

Las migraciones no tienen reversión automática. Si se vuelve a una imagen anterior, confirmar que acepta el esquema actual; la comprobación de readiness exige las migraciones exactas de la versión. Una restauración de base requiere un procedimiento probado y evaluar qué datos se perderían. No improvisar un rollback borrando migraciones.

## Operación antes de habilitar clientes

- Comprobar autorización y aislamiento de datos con varios propietarios y colaboradores.
- Probar la restauración de una copia de seguridad y fijar su frecuencia y retención.
- Configurar alertas de readiness, errores, espacio de base y vencimiento de certificados.
- Guardar secretos fuera de Git y definir cómo se rotan.
- Verificar cuentas, recuperación de contraseña, suscripciones y límite real del permiso offline.
- Revisar dependencias y procedencia/licencias de recursos antes de una distribución pública.

El workflow de GitHub verifica tipos, pruebas, migraciones y la imagen con PostgreSQL de servidor. No despliega automáticamente, no crea infraestructura ni modifica cuentas de proveedores.
