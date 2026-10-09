# Ensambla: uso de las apps y licencia

Propuesta para continuar el MVP. Los plazos y límites son decisiones de producto revisables. La vista «Uso y licencia» simula este recorrido; no implementa un servidor, pagos, firmas ni un bloqueo real.

## Cómo usarían las apps

El propietario crea su organización, elige una plantilla y adapta sus tablas, pantallas y reglas. Prueba la app con datos de ejemplo y la habilita para el trabajo diario. Las aplicaciones son configuraciones de un motor común: no hace falta desplegar un servidor por cada negocio ni entregar el código de su sistema como descarga.

Para usarla, abre «Mis aplicaciones» y entra en la vista de uso. En el producto final también puede abrir un enlace directo a una app o instalar un acceso en su equipo como PWA. El constructor queda separado de la operación cotidiana. Un trabajador debería entrar directamente a pedidos o inventario, sin pasar por las herramientas de diseño.

El propietario administra las personas y sus permisos. Para el producto, conviene distinguir cuatro roles:

| Rol | Función |
| --- | --- |
| Propietario | Plan, accesos, configuración, construcción y operación. |
| Editor | Construye y ajusta el sistema, con los datos que se le permitan. |
| Operador | Carga y actualiza registros; no cambia tablas, pantallas ni reglas. |
| Lectura | Consulta y exporta según los permisos otorgados. |

El MVP conserva sus tres roles simulados actuales. La separación del operador es una propuesta para la siguiente etapa. Los permisos reales deben comprobarse en el servidor para cada operación y cada organización; ocultar un botón no los asegura.

Instalar una app facilita abrirla. No otorga una licencia permanente ni crea una nueva prueba. En esta maqueta se instala Ensambla completo; un acceso instalado específico para cada app necesita resolver el alcance y el manifiesto de instalación en el producto.

## Política propuesta

La suscripción pertenece a la organización. Se cobra por capacidad —aplicaciones, integrantes y volumen de registros— y tiempo calendario. No conviene cobrar por las horas que una app afirma haber permanecido abierta: ese dato local no es confiable y también penalizaría usos normales.

| Regla | Propuesta inicial |
| --- | --- |
| Prueba | 14 días corridos desde la activación inicial de la organización, registrados en servidor. Crear otra app o reinstalar no reinicia el plazo. |
| Validación | Al abrir, al recuperar el primer plano y periódicamente mientras se usa con conexión; por ejemplo, cada 12 horas. Cada operación protegida también valida permisos y derecho de acceso en servidor. |
| Permiso sin conexión | Hasta 72 horas desde la última validación exitosa. Es una tolerancia para cortes de internet. |
| Límite del permiso | El menor entre esas 72 horas, el fin de la prueba y el fin del acceso pagado. Nunca regala días después del período autorizado. |
| Construcción | Con conexión en la primera versión del producto, para mantener la configuración consistente entre personas. |
| Carga sin conexión | Borradores y operaciones pendientes, con un permiso vigente y datos previamente descargados. |
| Vencimiento | La interfaz oficial deja de permitir nuevas operaciones. Conserva consulta y exportación de los datos ya autorizados y descargados, además de los cambios pendientes. |
| Cancelación | Mantiene el acceso hasta el fin del período ya pagado, salvo una revocación explícita por una causa definida. |
| Reactivación | El propietario conecta y regulariza la cuenta. Se recupera el uso y se revisan las operaciones pendientes. |

Las 72 horas reemplazan el ejemplo previo de siete días: reducen el intervalo sin contacto y deberían alcanzar para una interrupción común de conectividad. Deben validarse con usuarios reales. Si se requiere revocación inmediata o impedir estrictamente cualquier operación sin suscripción, esas operaciones necesitan conexión.

## Qué controla Ensambla

El servidor conserva la fecha de activación, vencimiento de la prueba, período pagado, estado de la suscripción, roles, dispositivos registrados, versiones de la licencia y última conexión verificada. Los cambios del estado comercial se procesan desde el proveedor de pagos con eventos autenticados e idempotentes.

Al validar una cuenta activa, emite un permiso temporal firmado. Su vencimiento se calcula con la hora del servidor:

```text
vence = mínimo(ahora_del_servidor + 72 horas, fin_del_derecho_de_acceso)
```

El permiso identifica organización, usuario, apps autorizadas, dispositivo registrado, capacidades, fecha de emisión, vencimiento e identificador único. Se verifica la firma, emisor, destinatario, alcance y vencimiento. La clave privada de firma permanece exclusivamente en el servidor. El cliente puede tener la clave pública para verificar el permiso sin conexión.

El servidor no acepta un permiso expirado ni confía en un estado comercial enviado por el dispositivo. La respuesta de validación usa una solicitud real y no se obtiene de la caché del service worker. `navigator.onLine` sirve como indicio visual; no demuestra que Ensambla esté accesible ni que la licencia se haya renovado.

Una revocación conocida al reconectar impide renovar y continuar operaciones protegidas. Una revocación nueva no puede llegar a un dispositivo desconectado: un cliente oficial puede mantener su permiso anterior hasta que expire. Acortar ese plazo reduce el retraso; no lo elimina.

## El límite del control offline

Una firma impide fabricar un permiso válido para el servidor o para un verificador íntegro. No impide que alguien modifique su propia copia de JavaScript y elimine las verificaciones locales. Tampoco transforma el reloj del equipo en una fuente de tiempo confiable.

Se pueden detectar retrocesos simples de fecha y pedir conexión, guardar la última hora recibida del servidor y usar tiempo monotónico mientras la app está abierta. Son medidas prácticas; no constituyen una garantía frente a la modificación del navegador, del almacenamiento o del código. La vinculación al dispositivo también necesita tratarse como un límite práctico, no como una imposibilidad de copia.

Ensambla puede conocer la última conexión verificada y el vencimiento del permiso emitido. Mientras el dispositivo está offline no puede saber si la aplicación sigue abierta, cuántas operaciones se hicieron ni cuál es el tiempo exacto de uso. Al reconectar recibe reportes, pero no debe tratarlos como una prueba íntegra del comportamiento pasado del cliente.

Por eso, para proteger realmente el valor de la suscripción, el servidor debe conservar las funciones que requieren autoridad compartida: sincronización, colaboración, integraciones y confirmación de operaciones críticas. El trabajo local se diseña como una tolerancia útil. No se promete una app autónoma ilimitada y, a la vez, control remoto permanente.

## Ejemplo: el taller de velas

Con conexión, una persona registra un pedido y confirma la producción. El servidor revisa receta, stock, permiso y rol; confirma todos los cambios en una transacción y registra una clave de idempotencia. Así, dos personas no descuentan dos veces el mismo pedido ni producen contra el mismo stock disponible.

Si se corta internet, puede consultar el inventario descargado, hacer cálculos orientativos y guardar pedidos como borradores durante el permiso temporal. El stock visto es una fotografía de la última sincronización. La propuesta inicial exige conexión para confirmar producción y descontar stock compartido: dos equipos offline no pueden garantizar que ambos estén usando el mismo inventario actualizado.

Al reconectar, envía los borradores y vuelve a calcular con el stock actual. Si alcanza, confirma. Si otro integrante consumió los materiales, avisa y conserva el borrador; no descuenta parcialmente. Si venció la cuenta, conserva los pendientes para exportación o revisión posterior. No ejecuta automáticamente cambios comerciales antiguos por el solo hecho de recibirlos.

La recepción para recuperación de pendientes, si se permite durante una cuenta inactiva, debe quedar separada de la confirmación de operaciones: autentica al usuario, comprueba organización, valida el contenido y lo guarda para revisión sin modificar stock ni pedidos definitivos.

## Arquitectura sencilla para continuar

- Un cliente PWA liviano con el motor de bloques compartido y las configuraciones de cada app.
- Una API que autentica, autoriza, valida licencias y ejecuta los procesos importantes.
- Una base de datos con organizaciones, personas, apps, esquemas, registros, suscripciones, permisos temporales y eventos.
- IndexedDB para la configuración descargada, datos necesarios y una cola local de pendientes. Cada cola se separa por cuenta y organización.
- Una ruta de renovación de permisos independiente de las operaciones y excluida de la caché de respuestas.
- Sincronización al abrir y reconectar. La sincronización de fondo es complementaria: no hay que depender de que un navegador ejecute tareas continuamente con la app cerrada.
- Versiones y claves de idempotencia para conflictos y reintentos. Los pendientes se validan contra la configuración y los datos vigentes.

Primero: autenticación, API, permisos y uso conectado. Segundo: estado de prueba/suscripción y validación real. Tercero: instalación y recuperación sin conexión en lectura. Cuarto: borradores offline y sincronización. Este orden evita mezclar simultáneamente seguridad, pagos y conflictos entre equipos.

## Base técnica

Estas fuentes sostienen los límites técnicos; los 14 días, 72 horas y 12 horas son propuestas propias de Ensambla.

- [OWASP: autorización](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): controles en servidor y comprobación de permisos en cada solicitud.
- [RFC 7519, sección 4.1.4](https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4): un token no debe aceptarse a partir de su vencimiento.
- [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine): el indicador de conectividad no es una prueba confiable de acceso a un servidor.
- [MDN: operación offline y en segundo plano](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation): caché, sincronización y límites de las tareas de fondo.
