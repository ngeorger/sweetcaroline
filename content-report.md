# Informe de contenido — importación desde WordPress

Generado por `scripts/import-wordpress.mjs` el 2026-10-13
desde `https://old.sweetcaroline.cl` en 4.2 s.

El importador **no corrige ni reescribe textos**: solo normaliza HTML, entidades
y espacios. Todo lo que sigue requiere una decisión del cliente.

## Resumen

| Métrica | Valor |
| --- | --- |
| Productos importados | 62 |
| Productos con imagen | 39 |
| Productos **sin** imagen | 23 |
| Productos sin descripción | 2 |
| Productos fuera de toda sección | 0 |
| Categorías de vitrina | 8 |
| Categorías vacías | 1 |
| Imágenes de galería | 9 |
| Nombres de producto duplicados | 1 |
| Términos sin mapear | 0 |

## Productos sin imagen (23)

Se muestran con una tarjeta de marca en lugar de una fotografía.

- Chocolate caliente
- Matcha
- Tarta de Berries
- Crema fambuesa
- Capuchino
- Moana
- Pato
- Escandalosos
- Zenón
- Crema fruta
- Amanda
- Panqueque
- Red Velvet
- Suculentas
- Torta Diabéticos
- Tarta de arándanos
- Choco Amor
- Bombera
- Hada
- Sol y luna
- Ópera
- Cherry
- Tres Leches

## Productos sin descripción (2)

- Crema fambuesa
- Tarta de manzana

## Nombres de producto duplicados (1)

Se les asignó un identificador con sufijo numérico para que la URL sea única.

- Red Velvet

## Productos fuera de toda sección (0)

No aparecerán en el catálogo hasta asignarles una categoría.

_Ninguno._

## Categorías vacías

- Postres — se oculta de las portadas de sección

## Términos de WordPress sin mapear

Términos presentes en la API que no forman parte de la vitrina y se descartan.

_Ninguno._

## Advertencias del importador

- category "Postres" has no products — hidden from section tiles

## Notas editoriales

- Las imágenes de la galería no tienen texto alternativo en WordPress. Se generó
  un texto genérico y **necesita revisión del cliente**.
- La categoría *Tartas* usaba en el sitio original la imagen de *Por trozo*. Se
  reemplazó por una fotografía real de tarta del catálogo.
- Se detectaron errores de escritura en el origen (`rlleno`, `bzcocho`,
  `fambuesa`, `Queremosa`, `integramente`). No se corrigieron.
- El texto de la página *En cafetería* se redactó a partir del contenido
  existente en la portada y la página de contacto del sitio original.
