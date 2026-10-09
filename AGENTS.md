# Trabajo en Ensambla

- Mantener este repositorio como fuente del producto. La publicación histórica en Sites es independiente.
- La interfaz fuente está en `frontend/public/`; sólo `backend/dist/` es salida generada.
- No cambiar diseño, textos, comportamiento ni datos locales incidentalmente al trabajar en infraestructura.
- Conservar compatibilidad con `ensambla.demo.v1`. No resetear datos ni importar datos locales al servidor sin un flujo explícito.
- Incorporar funciones reales por módulos en el backend, sin carpetas vacías ni servicios separados prematuramente.
- Validar entradas y permisos en el servidor; SQL parametrizado. Cada acceso a datos debe estar limitado al espacio autorizado.
- No ejecutar código arbitrario de usuarios. Stock/pedidos requieren transacciones e idempotencia.
- Las migraciones aplicadas son inmutables. Crear un archivo numerado nuevo para cada cambio.
- No subir `.env`, credenciales, backups, datos de clientes, `node_modules` ni archivos compilados.
- No cachear API, sesiones o estado de licencias en el service worker.
- Para cambios de código, ejecutar `npm run check`, `npm test` y `npm run build`; agregar pruebas de comportamiento cuando sea necesario.
- Para cambios visuales, revisar teclado, foco, móviles, selección en formularios y movimiento reducido.
- No afirmar que el producto está listo para clientes por tener Docker o pasar pruebas. Documentar el alcance real.
