# Orden de implementación

## 1. Cuentas y espacios

Registro, inicio/cierre de sesión, recuperación, hash de contraseña, sesiones seguras y protección CSRF cuando corresponda. Propietario real y colaboradores con permisos. Implementar el máximo inicial de tres accesos mediante una transacción. Probar acceso denegado entre cuentas antes de crear endpoints de negocio.

## 2. Guardar y recuperar aplicaciones

API de aplicaciones, colecciones y registros, validación del modelo, migración explícita de datos locales y control de revisión para evitar sobrescribir cambios. Conectar el constructor actual a esa API. Conservar personalización, categorías, subcategorías y filtros.

## 3. Un recorrido completo de negocio

Elegir plantilla → editar campos → crear formulario → cargar datos → usar aplicación. Inventario y pedidos como primer recorrido: confirmar un pedido comprueba stock y lo descuenta atómicamente, con idempotencia y auditoría. Incluir otro uso sin inventario para comprobar que el motor sea general.

## 4. Publicación interna y bloques

Separar borrador y versión en uso. Configuraciones versionadas de bloques y reglas declarativas; distinguir permisos de editar el sistema y operar los datos. Mejorar diseño móvil sin imponer que construir desde el celular sea idéntico a construir desde PC.

## 5. Suscripción y licencia

Prueba de 14 días calculada en el servidor; planes ilustrativos hasta definir límites. Integrar pagos, webhooks verificados, estado de cuenta y permisos offline firmados. Definir lectura/exportación al vencer y resolver cambios de reloj, revocación y límites de desconexión. El simulador actual no reemplaza estos servicios.

## 6. Sincronización e integraciones

Cola de operaciones offline, resolución de conflictos y renovación de acceso. Importaciones con vista previa y validación del servidor. Integraciones reales e IA sólo después de proteger credenciales, cuotas y acceso a datos.

## 7. Producción

Entorno de pruebas con varios usuarios, pruebas del flujo real en navegador, seguridad de cuentas y datos, carga representativa, restauración de backups, observabilidad, dominio, HTTPS y despliegue controlado. Abrir el producto cuando ese recorrido sea verificable.

## Próximo pedido recomendado

“Implementemos registro e inicio de sesión, con un espacio por propietario y permisos reales, usando esta estructura. Conservá la interfaz y agregá pruebas de separación entre cuentas.”
