# Imágenes de la landing

Creación: 9 de octubre de 2026. Generadas con ImageGen, usando el generador integrado de ChatGPT. Son escenas ilustrativas; no representan clientes ni testimonios de Ensambla.

Las fotos amplían los ejemplos de la landing hacia comercios y equipos. El taller de velas se mantiene como una de las cuatro aplicaciones del carrusel.

| Recurso final | Dimensiones | Tamaño | Uso |
| --- | --- | --- | --- |
| [landing-comercio-v1.webp](sandbox:/workspace/sites/ensambla/dist/assets/landing-comercio-v1.webp) | 1200 × 800 | 72.286 bytes | Comercio preparando pedidos. |
| [landing-equipo-v1.webp](sandbox:/workspace/sites/ensambla/dist/assets/landing-equipo-v1.webp) | 1200 × 800 | 68.794 bytes | Equipo organizando un proyecto. |

Los archivos finales están en `dist/assets/`, incluidos en el repositorio y en la caché de la demo. Se convirtieron de PNG a WebP y se ajustó su resolución para reducir el peso de descarga, sin modificar el contenido. La landing usa dimensiones explícitas y texto alternativo. Desde la versión 0.2.6 también se incluyen sin modificación de píxeles en `dist/landing-photos.js`, codificadas como URI `data:image/webp;base64`. Se muestran al renderizar, sin una descarga separada y sin depender del tipo MIME del hosting, que entregaba las rutas WebP como `application/octet-stream`. La caché incluye el módulo y los archivos originales; las figuras conservan un marco 3:2 y leyendas fuera de la imagen.

## Prompt de comercio

```text
Use case: photorealistic-natural. Asset type: editorial photography for a modern Argentinian no-code platform website named Ensambla. A candid, natural, medium-wide 3:2 horizontal photograph of a small independent shop owner, a woman about 30 with dark wavy hair, working behind a light wooden counter and calmly preparing a customer order. A few kraft parcels, a notebook, tasteful stationery and small home goods on simple shelves. A laptop with its screen facing away, no readable interface. The store feels modest, capable and creative, believable Buenos Aires neighborhood business, not luxury. Warm daylight, real texture, terracotta orange detail, sage mint accents, ivory walls. Relaxed purposeful expression, hands plausibly packing a parcel. Composition: person in the right half, parcels and open breathing room to the left, cropped from waist up, lightly blurred shelves. Premium candid editorial photography with subtle natural grain. No candles, wax, flames, candle tools, brand logos, signage, readable text, watermark, over-staged stock photo pose, exaggerated grin, 3D blocks or floating UI.
```

## Prompt de equipo

```text
Use case: photorealistic-natural. Asset type: editorial photography for the same modern no-code platform Ensambla landing page. A candid, medium-wide 3:2 horizontal photograph of a small team of three Latin American adults in their late 20s and 30s collaboratively planning a project at a light wooden table in a modest creative studio. One woman points at a paper planning sheet while a man and another woman discuss it, seen from a slightly elevated natural three-quarter camera angle. A closed laptop to one side, plain coral orange and muted lilac sticky notes, mint notebook, ivory walls, a potted plant and subtle studio shelves. Grounded everyday teamwork, diverse natural faces, hands anatomically plausible, working together rather than posing for camera. Soft natural morning light, warm tones, real fabric and paper textures, editorial photograph with subtle grain and airy composition. Useful crop space at edges. No candles, candle paraphernalia, meeting-room corporate cliches, charts with readable numbers, brand logos, readable writing, text overlays, watermark, floating interface or 3D blocks.
```

