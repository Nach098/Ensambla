# Bloques que se adaptan a cada sistema

Ensambla separa la información de su presentación. Una tabla guarda registros; los bloques muestran, cargan o calculan sobre esa información. Cambiar una vista no duplica los datos y quitar un bloque conserva su tabla.

## Tres decisiones del usuario

| Decisión | En la demo | Ejemplo de un taller |
| --- | --- | --- |
| Qué información guardar | Tablas y campos propios: texto, número, fecha, opciones o Sí/No. | Material, stock, unidad, costo, proveedor. |
| Cómo organizarla | Dos niveles de categorías, con nombres y opciones personalizables. | Familia: Insumos; Tipo: Ceras, Esencias, Pabilos. |
| Cómo trabajar con ella | Bloques conectados a una tabla, columnas, filtros guardados y parámetros. | “Ceras disponibles”, formulario “Nuevo insumo” e indicador de cantidad de materiales. |

Los nombres de los niveles pueden ser “Familia y tipo”, “Área y equipo” o “Proyecto y etapa”. Las subcategorías siempre pertenecen a una categoría. Cambiar un nombre conserva sus identificadores, registros y filtros.

## Recorrido concreto

1. Abrir **Datos** y crear una tabla, importar un CSV o adaptar una plantilla.
2. Entrar en **Categorías y subcategorías**. Nombrar los dos niveles y agregar opciones.
3. Editar los registros para clasificarlos. Al elegir una categoría, el formulario ofrece solo sus subcategorías.
4. En **Diseño**, agregar una tabla o un indicador y conectarlo a la tabla de datos. Guardar la conexión antes de configurar sus campos y condiciones.
5. Abrir **Vista filtrada**. Por ejemplo: Familia es Insumos + Tipo es Ceras. Ambas condiciones deben cumplirse.
6. Decidir si el bloque muestra buscador y filtros, y qué filtros rápidos ofrecer. Los filtros durante el uso se combinan con la vista guardada y se mantienen separados por bloque.
7. Agregar un formulario conectado a la misma tabla. Elegir los campos y personalizar el texto del botón. Los campos obligatorios deben estar presentes; un formulario de pedidos inicia el estado como Pendiente.
8. Abrir **Probar mi app**. Cargar registros y consultar distintas vistas de los mismos datos.

En aplicaciones existentes, activar categorías agrega dos campos sin borrar ni clasificar automáticamente los registros previos. La nueva plantilla de velas ya incluye ejemplos de clasificación. Quitar una categoría o subcategoría usada requiere reasignar sus registros y revisar los filtros guardados que la referencian.

## Qué configura cada bloque

| Bloque | Parámetros actuales | Otros usos |
| --- | --- | --- |
| Tabla | Conexión, columnas, filtros guardados, filtros rápidos, ancho y posición. | Clientes de una zona, tareas de un área, registros de un proyecto. |
| Formulario | Conexión, campos visibles y texto del botón. | Cargar personas, pedidos, tareas o materiales nuevos. |
| Indicador | Conexión, cantidad/suma/promedio/mínimo/máximo, campo numérico, unidad y filtros. | Contar pendientes, sumar horas de un equipo, promediar costos de una familia. |
| Calculadora | Dos etiquetas de entrada, multiplicación/suma/resta/división, nombre del resultado, importe o número y unidad. | Unidades × gramos; horas × costo; importe ÷ personas. |
| Texto | Contenido y distribución. | Indicaciones del equipo o una bienvenida. |
| Inventario, pedidos y recetas | Vistas y proceso de la plantilla de velas. | Stock por familia, costos y validación de insumos; moldes reutilizables. |

La calculadora trabaja con dos valores ingresados en el bloque. El indicador consulta registros. Un formulario agrega un registro; editar o reponer uno existente se hace desde la tabla. Las automatizaciones entre tablas de esta demo corresponden al taller de velas.

## Modelo y expansión

Cada colección puede tener `taxonomy`: claves de los dos campos, nombres de los niveles y grupos con hijos. Los registros guardan identificadores estables. Los bloques guardan `filters` declarativos: campo, operador y valor. Las condiciones se validan contra la tabla y se combinan con AND. La búsqueda usa los nombres legibles y no distingue acentos. No se evalúa código o expresiones aportadas por el usuario.

La demo admite hasta 20 campos, 20 categorías, 30 subcategorías por categoría y 12 condiciones por vista. Son límites del prototipo. La copia JSON conserva estructura, valores, categorías y parámetros; el CSV exporta las etiquetas legibles y su reimportación crea una tabla nueva.

Para seguir hacia el producto, la próxima ampliación útil es una relación explícita entre tablas: un pedido referencia productos y una receta referencia materiales. Después se pueden agregar expresiones limitadas que calculen columnas, acciones de formulario que actualicen registros existentes y reglas declarativas reutilizables. Conviene mantener un catálogo de operadores y acciones validado en servidor, con versiones y permisos por organización.

Las categorías de más niveles, condiciones OR y relaciones entre campos todavía no forman parte de esta versión. El stock compartido y sus cambios concurrentes necesitan la API y las transacciones planteadas en [uso y licencias](uso-y-licencias.md). La personalización aquí implementada es funcional y local al navegador.
