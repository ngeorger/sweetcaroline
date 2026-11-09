# Sweet Caroline — PoC sitio web

Sitio web de **Sweet Caroline**, pastelería fina y chocolatería en San Joaquín,
Santiago, Chile. Reemplaza el sitio WordPress/WPBakery anterior por un sitio estático,
rápido y accesible.

- **Producción:** https://www.sweetcaroline.cl (sitio oficial, fuera del alcance de este repo)
- **Origen del contenido:** el WordPress configurado en `WORDPRESS_BASE_URL`
  (`https://old.sweetcaroline.cl`) — se lee una sola vez, nunca en build
- **Éste sitio:** https://sredevopsorgagents.github.io/sweetcaroline/ (GitHub Pages)

## Stack

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Framework | [Astro 7](https://astro.build/) (salida estática) | HTML pre-renderizado, casi sin JavaScript |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com/) vía `@tailwindcss/vite` | Tokens de marca en CSS, sin archivo de configuración |
| Lenguaje | TypeScript | Tipos estrictos en contenido y utilidades |
| Contenido | JSON + Markdown versionados, validados con Zod | Builds deterministas, diffs revisables |
| Imágenes | `astro:assets` + `sharp` | AVIF/WebP responsivos en build |
| Tipografía | Astro Fonts API (Poppins) | Auto-alojada, sin request a Google |
| Tests | Vitest + Playwright + axe-core | Unidad, e2e y accesibilidad |
| Hosting | GitHub Pages | Donde ya apunta el dominio, sin costo |

## Requisitos

- Node.js **≥ 22.12** (el `engines` de Astro 7; también es el piso de
  `--env-file-if-exists`)
- npm

## Empezar

```bash
npm install
npm run dev          # http://localhost:4321
```

## Variables de entorno

Nada se configura en runtime: todo se resuelve en build o al importar contenido.
`astro.config.mjs` lee `SITE_URL` y `BASE_PATH`; `src/lib/indexing.ts` lee
`ALLOW_INDEXING`; el importador lee `WORDPRESS_BASE_URL`.

| Variable | Para qué | Por defecto | Requerida por |
| --- | --- | --- | --- |
| `WORDPRESS_BASE_URL` | Origen de la API REST de WordPress que siembra `src/content/**` | **ninguno** | `content:import`, `content:check` |
| `SITE_URL` | URL pública de este build; de su path se deriva `base` | `https://sweetcaroline.cl` | `build`, `redirects` |
| `BASE_PATH` | Escape hatch que anula el `base` derivado | path de `SITE_URL` | — (normalmente sin usar) |
| `ALLOW_INDEXING` | `1` publica sitemap y `index, follow` | sin definir = bloqueado | `build` |

Copia el archivo de ejemplo (`.env` está en `.gitignore`):

```bash
cp .env.example .env
```

Las variables del shell **tienen prioridad** sobre `.env`, así que un caso puntual
se resuelve en línea:

```bash
WORDPRESS_BASE_URL=https://otro-origen.test npm run content:check
```

**`WORDPRESS_BASE_URL` no tiene valor por defecto, a propósito.** Un import sin
configurar falla con un mensaje que dice qué hacer, antes de tocar la red, en vez
de leer producción en silencio:

```
[import] WORDPRESS_BASE_URL is not set. Copy .env.example to .env, or pass --wp-base <origin>.
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build estático a `dist/` + stubs de redirección |
| `npm run preview` | Sirve `dist/` localmente |
| `npm run check` | `astro sync` + `tsc --noEmit` |
| `npm test` | Tests de unidad (Vitest) |
| `npm run test:e2e` | Tests e2e y de accesibilidad (Playwright + axe) |
| `npm run content:import` | Re-importa el contenido desde WordPress |
| `npm run content:check` | Verifica el contenido sin escribir |
| `npm run redirects` | Regenera los stubs de URLs antiguas |

Los dos comandos de contenido cargan `.env` automáticamente
(`node --env-file-if-exists=.env`), así que no hay que exportar nada a mano.

## Contenido

El contenido se importa una sola vez desde la API REST de WordPress y se
versiona en el repositorio. **El importador no se ejecuta nunca en CI**: necesita
red y haría los builds no deterministas. Por lo mismo `WORDPRESS_BASE_URL` no es
un secreto de CI — no hay ningún job que lo use.

```
npm run content:import                 # importación completa (baja imágenes)
npm run content:import -- --no-images  # sólo datos, sin descargar imágenes
npm run content:check                  # verifica sin escribir
```

El origen se resuelve en este orden: `--wp-base` → `WORDPRESS_BASE_URL` → error.
`--wp-base` gana sobre `.env`, para apuntar a un clon o a un dump local sin editar
el archivo:

```bash
npm run content:check -- --wp-base http://localhost:8080
```

Escribe:

```
src/content/products/*.json    62 productos (procedencia, no publicado)
src/content/categories/*.json  8 categorías de vitrina (procedencia)
src/content/pages/*.md         nosotros, en-cafeteria
src/data/site.json             contacto, horarios, dirección
src/data/home.json             hero y destacados (procedencia, sin uso)
src/data/gallery.json          galería
src/data/instagram.json        cuenta de Instagram y foto para metadatos
src/data/legacy-urls.json      URLs antiguas -> portada
src/assets/**                  imágenes normalizadas a WebP
content-report.md              informe para el cliente
```

Reglas del importador:

1. **Nunca reescribe textos.** Sólo normaliza HTML, entidades y espacios.
2. Las imágenes se descargan desde el `source_url` que informa la API, nunca
   desde una ruta adivinada (el directorio de uploads es inconsistente).
3. Los errores de tipeo, las descripciones faltantes y las fotos faltantes se
   reportan en `content-report.md`; no se corrigen solos.

El campo `sourceUrl` de cada producto es **provenance**: registra de dónde salió
ese contenido en la importación que ya ocurrió. No es configuración y no cambia al
mover `WORDPRESS_BASE_URL`.

Después de importar, revisar `content-report.md` y correr `npm test` — los tests
de integridad de contenido fallan si una categoría no resuelve, si un producto
queda fuera de toda sección o si una imagen referenciada no existe.

## Arquitectura

```
src/
  content.config.ts     esquemas Zod de las colecciones
  content/              contenido importado
  data/                 navegación, sitio, galería, Instagram, URLs antiguas
  lib/                  images.ts, seo.ts, site.ts, indexing.ts
  layouts/BaseLayout    head, SEO, JSON-LD, header, footer
  components/           UI reutilizable
  pages/                rutas
  styles/global.css     tokens de marca
scripts/
  import-wordpress.mjs  importador (manual, con red)
  wp-base.mjs           resolución de WORDPRESS_BASE_URL
  emit-redirects.mjs    stubs de URLs históricas
  generate-brand-assets.mjs
tests/unit/             Vitest — catálogo, contenido, deploy, wp-base
tests/e2e/              Playwright + axe
docs/adr/               decisiones y su justificación
```

Un solo artefacto desplegable (`dist/`). Sin servidor, sin base de datos, sin
configuración en runtime. Ver `docs/adr/` para las decisiones y su justificación,
y [`AGENTS.md`](AGENTS.md) para la guía operativa del repositorio.

### Rutas

| Ruta | Página |
| --- | --- |
| `/` | Portada: llamada a la acción a Instagram |
| `/nosotros/` | Quiénes somos, misión, visión |
| `/contacto/` | Contacto, horarios, mapa |
| `/404` | No encontrado |

Las secciones `Productos`, `En cafetería` y `Galería de fotos` fueron retiradas
(ver ADR 0006). Sus datos siguen versionados en `src/content/**` como procedencia
del import, pero ninguna ruta los publica, y sus rutas ya no existen.

Las URLs históricas de WordPress (`/nuestros-productos/...`, `/galeria/`) siguen
resolviendo mediante stubs con `meta refresh` + `canonical`; ahora todas apuntan a
la portada.

### Portada: llamada a la acción a Instagram

La portada **no incrusta publicaciones**. Muestra una introducción y un botón
"Ver el perfil en Instagram" que abre
[instagram.com/sweetcarolinechile](https://www.instagram.com/sweetcarolinechile/)
en una pestaña nueva, seguido de la franja de contacto. La página no carga el
script de Instagram, ni `iframe`s, ni `embed.js`: la única URL de Instagram en el
HTML construido es la del perfil, y no se hace ninguna petición a
`instagram.com` hasta que la persona hace clic.

Esto es intencional (ADR 0006). Instagram no ofrece embed oficial de perfil
completo, y el embed por publicación obligaba a mantener una lista de
permalinks, cargaba cookies de terceros en la portada y podía quedar en blanco
cuando Instagram responde `x-frame-options: DENY`. Un enlace elimina las tres
cosas de una vez.

Si en el futuro se quisiera volver a mostrar el feed, hay que reponer el
componente y la lista `posts` en `src/data/instagram.json`; el diseño anterior
está documentado en el mismo ADR y en el historial de git.

`src/data/instagram.json` conserva sólo `profile` y `fallback` (las nueve
fotografías importadas). Ninguna página las muestra: la primera es la imagen de
Open Graph, que debe ser un asset local porque `astro:assets` no puede optimizar
un archivo remoto.

`tests/unit/deploy.test.ts` y la suite e2e verifican ambas ramas.

## Limitaciones conocidas

- El contenido es sólo lectura para el cliente: editarlo requiere un commit.
  Ver ADR 0002 para el plan de un CMS basado en Git.
- El feed no se muestra en el sitio: la portada sólo enlaza al perfil, así que
  quien no haga clic no ve las publicaciones. Mostrarlas exigiría un token de la
  propia cuenta `@sweetcarolinechile`; ver ADR 0006.
- 23 de 62 productos no tienen fotografía en WordPress. Listados en
  `content-report.md` (ya no se publican: ver ADR 0006).
- 2 productos no tienen descripción en el origen.
- `public/CNAME` no se publica, porque una página de proyecto no debe declarar un
  dominio que no sirve. Debe **restaurarse antes del cutover** al dominio raíz,
  junto con `ALLOW_INDEXING=1`; ver ADR 0003.
- El repositorio que sirve `sweetcaroline.cl` (un export estático de WordPress de
  2024) aún no está identificado. Hasta resolverlo, producción no se toca.
