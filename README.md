# Ensambla · primera maqueta funcional

Proyecto académico para la Tecnicatura en Desarrollo Web de UNLaM. Una landing y un constructor de aplicaciones internas por bloques para comercios, equipos y proyectos, con un perfil de propietario de ejemplo y varias plantillas.

## Ejecutar

Se sirve la carpeta `dist` como sitio estático. No hay compilación ni dependencias de producción.

```bash
python -m http.server 8000 --directory dist
```

Abrir `http://localhost:8000`. Los módulos requieren un servidor HTTP; abrir el HTML con `file://` no funciona. Para verificar la lógica:

```bash
npm test
```

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `dist/domain.js` | Modelos, plantillas, validación, cálculo de producción e importación CSV. |
| `dist/store.js` | Persistencia local. Punto de sustitución por una API. |
| `dist/app.js` | Navegación, formularios y acciones de la interfaz. |
| `dist/landing.js` | Presentación de la propuesta. |
| `dist/landing-photos.js` | Dos fotos WebP integradas como URI de datos con su formato explícito. |
| `dist/ambient.js` | Pausa de los adornos por visibilidad de cada sección, sin bucles JavaScript de animación. |
| `dist/landing-play.js` | Ideas de portada, calculadora, selección y distribución de piezas sin huecos, revelado al desplazar y pausa del movimiento. |
| `dist/panel-motion.js` | Respuesta breve al activar tarjetas; respeta selección de texto, edición, arrastre, pausa y movimiento reducido. |
| `dist/result-motion.js` | Interpolación de resultados, cancelación de recálculos anteriores y anuncio del valor final. |
| `dist/pages.js` | Espacio personal, administración y guía. |
| `dist/builder.js` | Diseño de pantallas, datos, procesos, identidad e integraciones. |
| `dist/runtime.js` | Renderizado compartido de bloques y aplicación resultante. |
| `dist/styles.css`, `dist/energy.css`, `dist/landing-theme.css`, `dist/adapt.css`, `dist/lively.css`, `dist/readable.css`, `dist/interaction.css`, `dist/rhythm.css` y `dist/composition.css` | Identidad, adaptación a dispositivos, piezas de color, secciones variadas, fondos, legibilidad y movimiento. |
| `dist/adapt-domain.js` y `dist/adapt-ui.js` | Categorías dependientes, consultas declarativas, parámetros de bloques y formularios. |
| `dist/carousel.js` | Navegación manual, teclado, anuncios, deslizamiento nativo y recorrido automático con pausas por interacción y visibilidad. |
| `dist/layout-play.js` | Distribuciones reversibles para explorar el diseño de una pantalla. |
| `dist/access.js` y `dist/licensing.js` | Recorrido de uso y simulador de la política de acceso. Sin validación real. |
| `dist/motion.js` | Transiciones suaves con alternativa para navegadores anteriores y movimiento reducido. |
| `dist/dialog-guard.js` | Distingue un clic en el fondo de una selección o un arrastre; protege formularios del cierre exterior. |
| `dist/sw.js` | Caché offline de los recursos de esta demo. |

El mismo modelo describe las tablas, campos, registros, pantallas y bloques. Las aplicaciones no generan ni ejecutan código del usuario. `layouts.desktop` y `layouts.mobile` guardan el orden por separado; nombre, color, símbolo, logo y datos son comunes.

## Qué se puede probar

1. Elegir una plantilla o empezar desde cero.
2. Crear tablas, agregar campos y cargar registros.
3. Importar CSV con detección y revisión de tipos.
4. Agregar bloques de tabla, formulario, texto, indicador o calculadora; configurar su contenido, ancho y orden.
5. Editar recetas y calcular insumos para un pedido.
6. Confirmar producción con stock suficiente. El descuento es atómico e idempotente para cada pedido. Los moldes son reutilizables y se validan por lote.
7. Simular Mercado Libre y agregar pedidos ilustrativos.
8. Simular permisos de propietario, editor y lectura; hasta tres accesos adicionales.
9. Exportar/restaurar una copia JSON y exportar tablas CSV.
10. Probar tres distribuciones de una pantalla y volver al diseño anterior durante la sesión.
11. Explorar el simulador de uso y licencia: conexión, permiso offline, vencimiento y cambio de fecha.

12. Definir categorías y subcategorías por tabla, con nombres propios para los dos niveles.
13. Buscar por etiquetas y combinar condiciones de categorías, opciones, números, fechas y valores Sí/No.
14. Guardar filtros en un bloque y elegir qué filtros rápidos mostrar. Cada vista consulta los mismos registros.
15. Configurar indicadores de cantidad, suma, promedio, mínimo o máximo; ajustar operaciones, etiquetas, formato y unidades de calculadoras.
16. Explorar cuatro usos en el carrusel de la landing, con controles, teclado, deslizamiento táctil y recorrido automático cada nueve segundos.
17. Alternar entre inventario, equipo, proyectos y cálculos en la portada; calcular una estimación con valores propios.
18. Sumar, quitar y mezclar cuatro tipos de piezas en una pantalla ilustrativa, sin crear ni alterar datos de las aplicaciones.

## Landing interactiva

La portada y las secciones reparten los ejemplos entre inventarios, presentismo, tareas y herramientas propias. El taller de velas ocupa una diapositiva del carrusel y conserva su plantilla funcional. Las fotos de comercio y equipo son escenas ilustrativas generadas con ImageGen; ver [recursos y prompts](docs/imagenes-landing.md).

El recorrido automático se detiene mientras el usuario lee con el puntero sobre el carrusel, mantiene el foco en él, usa el gesto táctil, lo deja fuera de pantalla o cambia de pestaña. Tiene un control propio de pausa. El control general pausa el recorrido y las animaciones decorativas; la preferencia del sistema de movimiento reducido se respeta también al cambiar durante la sesión. Los cambios de portada y piezas tienen transiciones breves, y la entrada de secciones se revela al desplazar. El contenido sigue visible cuando falta soporte de observación.

Los textos secundarios usan una base de 0,875 rem y los textos principales y campos, 1 rem. Las tarjetas crecen con el contenido, las etiquetas pequeñas tienen más contraste y los controles principales reservan al menos 44 píxeles de alto. En pantallas angostas, los menús, las vistas y las piezas se distribuyen en más filas. La navegación lateral cerrada queda fuera del recorrido de teclado; se puede abrir, cerrar y volver al botón con Escape. Las aclaraciones repetidas de demo se retiraron de la interfaz; el alcance técnico sigue documentado aquí.

Las tarjetas y paneles responden con una elevación suave al pasar el puntero o recibir foco. Al activar una tarjeta, un movimiento adicional de 2 píxeles dura 320 ms; no se aplica al editar campos, seleccionar texto o arrastrar bloques. La pausa, el cambio de pantalla, una pestaña oculta y el movimiento reducido detienen esas animaciones. Las respuestas de las tarjetas terminan después de cada interacción.

El fondo incorpora cinco formas planas que se desplazan y giran lentamente. La portada aparece en una secuencia breve; las secciones entran con pequeños desfases. Las conexiones de la portada tienen un recorrido suave y las fotos acercan su encuadre de forma mínima. El título del carrusel aparece al costado; el de personalización ocupa una celda de su composición; los planes combinan una introducción lateral, una prueba horizontal y dos tarjetas debajo. Las composiciones se apilan cuando falta ancho.

Los adornos de la portada, el carrusel, el área de piezas, las fotos, los planes y el cierre se pausan lejos de la zona visible. Solo la diapositiva activa mueve su pieza. Todos respetan la pausa general, la pestaña oculta y el movimiento reducido. El control de pausa permanece visible durante el recorrido. El fondo usa CSS y formas vectoriales; no agrega imágenes, bibliotecas ni un bucle JavaScript por cuadro. La entrada de la portada no se repite al volver de una pausa.

El área de piezas de la landing usa el ancho completo de la sección. Dos piezas comparten una fila y cuatro forman dos filas de dos, sin una columna lateral vacía. Con tres piezas, una ocupa el ancho completo y las otras dos comparten una fila; una pieza sola también usa todo el ancho. El orden del HTML coincide con el orden visible después de mezclar, quitar o sumar. Por debajo de 680 píxeles, cada pieza usa una fila completa. Los cambios de posición y tamaño se animan por pieza con la misma alternativa de transición que usa el constructor.

El header reúne marca, tres bloques de navegación y acceso al espacio personal. El cierre integra una sola invitación a crear, un isotipo proporcionado entre pequeñas piezas y cuatro destinos de navegación compactos. Reemplaza la suma de un banner y otro título grande en el footer. Ambos conservan todas sus acciones en pantallas angostas. Las fotos de comercio y equipo están separadas en una grilla y sus leyendas aparecen debajo, en el flujo del documento. Las fotos se incluyen en `landing-photos.js` como URI `data:image/webp` para no depender del tipo MIME de sus rutas; cargan al renderizar, mantienen un marco de 3:2 y quedan fuera del revelado que oculta paneles. Los fondos de las secciones de fotos, planes y piezas dejan de ser grandes superficies de color; la paleta se reparte entre las tarjetas y los adornos. Las vistas de portada y carrusel se desplazan 8 píxeles lentamente y se detienen al interactuar; los controles mantienen su posición durante la edición.

Los resultados de las calculadoras de portada y de las aplicaciones pasan del valor visible al nuevo durante 460 ms. Un recálculo cancela el anterior y usa el último valor visible como inicio. Los lectores de pantalla reciben solo el resultado final. Movimiento reducido, pausa de la landing y pestaña oculta muestran el resultado directamente. Cambiar o quitar una pantalla detiene sus cuadros pendientes.

## Categorías y bloques a medida

En el constructor, abrir **Datos → Categorías y subcategorías**, definir los nombres de los niveles y sus opciones y guardar. Después, editar los registros para clasificarlos. En un formulario, el segundo nivel solo ofrece opciones del primero. La nueva plantilla de velas incluye “Familia → Tipo”; las aplicaciones existentes mantienen sus datos y se pueden clasificar desde esa opción, sin un reinicio automático.

En **Diseño**, seleccionar una tabla o indicador, conectar su tabla y guardar. Abrir **Vista filtrada** para guardar condiciones que delimitan el bloque. Los filtros de uso se combinan con las condiciones guardadas y afectan solo esa vista; su actualización conserva los formularios de otros bloques. “Mostrar buscador y filtros” y “Filtros rápidos visibles” permiten decidir qué puede explorar el equipo.

Las categorías mantienen identificadores estables al renombrarse. Para eliminar una opción usada, hay que reasignar sus registros y quitar sus condiciones guardadas. Las categorías, los parámetros y los filtros se incluyen en la copia JSON; el CSV exporta los nombres legibles. Ver [bloques a medida](docs/bloques-a-medida.md) para ejemplos y la expansión del modelo.

## Alcance de la demo

Los datos viven en `localStorage` de cada navegador. No hay autenticación real, usuarios compartidos, servidor, cobros ni conexión externa con Mercado Libre. Los accesos, la publicación de aplicaciones, los planes y el asistente son simulaciones locales. La creación y edición siguen disponibles durante la demo; el indicador de 14 días es ilustrativo y no limita el uso.

La asistencia propone plantillas mediante palabras clave. La importación CSV y el cálculo de producción son reales. CSV es el formato de intercambio con Excel en esta versión; no se leen archivos XLS/XLSX directamente.

El service worker guarda Ensambla completo para abrirlo sin conexión después de la primera carga y del guardado exitoso de la caché. La instalación depende del navegador. No se empaqueta cada aplicación como ejecutable separado ni se controla una licencia offline real.

## Continuar hacia el producto

Primero, sustituir la persistencia local por una API y añadir autenticación y autorización en servidor. Validar los modelos en el servidor y aislar los datos por organización. El cálculo de producción debe ejecutarse dentro de una transacción y con una clave de idempotencia; dos dispositivos pueden confirmar el mismo pedido al mismo tiempo.

Después, ampliar las relaciones y reglas declarativas entre tablas, añadir un registro de cambios y sincronización offline. Para equipos modestos, mantener un cliente liviano, paginar tablas y descargar solo los datos necesarios. El contenido importado nunca debe ejecutarse como código.

La propuesta de suscripciones usa un permiso firmado de hasta 72 horas sin conexión, limitado por el fin de la prueba o del período pagado. El control real se aplica en servidor. Las operaciones críticas, como confirmar producción y descontar stock compartido, necesitan conexión en la primera versión del producto. Ver [uso y licencias](docs/uso-y-licencias.md) para el recorrido, los límites técnicos y el orden de implementación.

Propuesta comercial inicial: prueba de 14 días; plan Esencial de una aplicación, tres integrantes adicionales y 5.000 registros; plan Crecer de cinco aplicaciones, diez integrantes adicionales y 25.000 registros. Son límites ilustrativos. Precios y costos todavía deben validarse.

## Identidad y verificación

Paleta del manual: naranja `#F97316`, coral `#FB5852`, arena `#E6C9A8`, pizarra `#263443` y marfil `#FFF8F1`. Tipografía Plus Jakarta Sans alojada localmente. Isotipo SVG basado en la E de cinco bloques del logo final. Las ilustraciones de marca usan el isotipo vectorial oficial. La interfaz amplía la paleta con menta `#42D6B5`, azul `#65B8FF`, violeta `#B6A1F9` y amarillo `#FFD25F`. Los colores identifican tipos de bloques y se acompañan con iconos y etiquetas. La landing usa un fondo durazno, texturas discretas y composiciones de bloques en dos dimensiones.

Los pop-ups con formularios o campos no se cierran al hacer clic en el fondo. En los diálogos informativos, el clic debe empezar y terminar afuera sin arrastrar. Una selección de texto que termina afuera mantiene el diálogo y su contenido. Los botones de cierre, Cancelar y Escape permiten salir de forma explícita.

Se incluyen 91 pruebas de producción, CSV, modelos, categorías, filtros combinados, indicadores, cálculos configurables, formularios dependientes, carrusel, pausas automáticas, interacciones de portada, piezas, movimiento, resultados animados, distribuciones, escenarios de acceso, cierre de diálogos y renderizado de las vistas. También se verifican sintaxis, importaciones, archivos de la caché, estructura HTML, referencias y textos de las vistas. Se comprobó mediante HTTP autenticado que las dos rutas WebP publicadas respondían 200 con los archivos completos, pero con `application/octet-stream`; el isotipo SVG respondía con `image/svg+xml`. Las fotos integradas mantienen los bytes originales y declaran su formato de imagen. No se realizó revisión visual en navegador en el entorno de creación, porque el controlador de preview de Sites no estaba disponible.
