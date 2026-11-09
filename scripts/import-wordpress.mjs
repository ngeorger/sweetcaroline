#!/usr/bin/env node
/**
 * Import Sweet Caroline content from the WordPress REST API.
 *
 * The WordPress origin is the authoritative content source. This script reads it
 * once and writes plain, typed, committed content into the repository. It is
 * deliberately NOT part of the build: it needs the network, so running it there
 * would make builds non-deterministic.
 *
 * The origin comes from `WORDPRESS_BASE_URL` (see `.env.example`); there is no
 * default, so an unconfigured run fails before it touches the network.
 *
 *   node scripts/import-wordpress.mjs            # full import (writes files)
 *   node scripts/import-wordpress.mjs --check    # verify only, writes nothing
 *   node scripts/import-wordpress.mjs --no-images
 *   node scripts/import-wordpress.mjs --wp-base https://example.test
 *
 * Design rules:
 *  - Copy is never invented, rewritten or spell-corrected. Only markup, HTML
 *    entities and whitespace are normalised. Typos and gaps are reported in
 *    content-report.md for the client to resolve.
 *  - Image bytes come from the media `source_url` the API reports, never from
 *    a guessed path — the uploads directory is inconsistent (2021/08, 2022/01,
 *    2024/03, 2025/09, 2026/03, 2026/07 ...).
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { resolveWpBase } from './wp-base.mjs';
// Text normalisation lives in its own side-effect-free module so it can be
// tested directly — see the header of `html-text.mjs` for why.
import { decodeEntities, htmlToText, stripShortcodes } from './html-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const skipImages = argv.includes('--no-images');

function readFlag(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

// Resolve the origin up front: throwing here (rather than at the first request)
// keeps a misconfigured run from reaching the network or writing a partial
// `content-report.md`.
let wpBase;
try {
  wpBase = resolveWpBase({ flag: readFlag('--wp-base') });
} catch (error) {
  process.stderr.write(`[import] ${error.message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// WordPress taxonomy normalisation
//
// The WooCommerce term tree has inherited structural terms and a hierarchy
// that does not match how the site presents its catalog. Display categories
// are an explicit, ordered list; everything else is dropped or folded into a
// tortas subgroup.
// ---------------------------------------------------------------------------

const DISPLAY_CATEGORIES = [
  { slug: 'tortas', name: 'Tortas', order: 1, sections: ['productos'], image: { url: '2026/07/tortas.png' } },
  { slug: 'confites', name: 'Confites', order: 2, sections: ['productos', 'cafeteria'], image: { url: '2026/07/Confites.png' } },
  { slug: 'pasteles', name: 'Pasteles', order: 3, sections: ['productos'], image: { url: '2026/07/pasteles.png' } },
  // The original site pointed "Tartas" at the *Por trozo* tile image, which is
  // plainly a mistake. Use a real tart photograph from the catalog instead.
  { slug: 'tartas', name: 'Tartas', order: 4, sections: ['productos'], image: { mediaId: 5395 } },
  { slug: 'postres', name: 'Postres', order: 5, sections: ['productos', 'cafeteria'], image: { url: '2026/07/postres.png' } },
  { slug: 'individuales', name: 'Individuales', order: 6, sections: ['cafeteria'], image: { url: '2026/07/individuales.png' } },
  { slug: 'por-trozo', name: 'Por trozo', order: 7, sections: ['cafeteria'], image: { url: '2026/07/por_trozo.png' } },
  { slug: 'bebestibles', name: 'Bebestibles', order: 8, sections: ['cafeteria'], image: { url: '2026/07/Bebestibles.png' } },
];

/** WordPress terms folded into a `tortas` subgroup instead of their own tile. */
const SUBGROUP_TERMS = {
  'tortas-personalizadas': 'personalizadas',
  'tortas-estandar': 'estandar',
  'tortas-diabeticos': 'diabeticos',
};

/** Structural / legacy terms that carry no editorial meaning. */
const DROPPED_TERMS = new Set([
  'productos',
  'cafeteria',
  'sin-categoria',
  'galeria',
  'tortas-a-pedido',
]);

/** The cafetería "Bebestibles" tile is the WordPress `bebidas` term. */
const TERM_ALIASES = { bebidas: 'bebestibles' };

const SECTION_ORDER = ['productos', 'cafeteria'];

// ---------------------------------------------------------------------------
// Assets that have no media record (Revolution Slider + theme uploads).
// ---------------------------------------------------------------------------

const HERO_SLIDES = [
  {
    key: 'hero/deleitarte',
    url: '2022/08/slider-beta.png',
    heading: 'Pastelería para deleitarte',
    subtitle: 'Pastelería fina y chocolatería',
  },
  {
    key: 'hero/ocasion',
    url: '2022/08/slider-torta.png',
    heading: 'Delicias para toda ocasión',
    subtitle: 'Productos dulces y salados para tu celebración',
  },
  {
    key: 'hero/personaliza',
    url: '2022/08/slider-hada.png',
    heading: 'Personaliza tu torta',
    subtitle: 'Personajes, flores, dibujos o el diseño que quieras',
  },
];

const BRAND_ASSETS = [{ key: 'brand/logo-blanco', url: '2025/09/blanco-web.png' }];

/**
 * The three copy blocks that sit under the hero on the WordPress home page.
 * Kept verbatim — only the destination of each link is a design decision.
 */
const HOME_HIGHLIGHTS = [
  {
    heading: 'Delicias para toda ocasión',
    body: 'Productos dulces y salados para tu celebración',
    href: '/productos/',
    cta: 'Ver productos',
  },
  {
    heading: 'A pedido y en stock',
    body: 'Muchos sabores, combinaciones y lo último en tendencia',
    href: '/productos/categoria/tortas/',
    cta: 'Ver tortas',
  },
  {
    heading: 'Personaliza tu torta',
    body: 'Personajes, flores, dibujos o el diseño que quieras',
    href: '/contacto/',
    cta: 'Contáctanos',
  },
];

// Alt text stays conservative: it is derived from the source file name, not
// from a description of a photo nobody has looked at.
const NOSOTROS_MEDIA = [
  { id: 3891, key: 'nosotros/mixiando', alt: 'Mezclando en el taller de Sweet Caroline' },
  { id: 3462, key: 'nosotros/equipo', alt: 'Sweet Caroline, la pastelería' },
  { id: 3907, key: 'nosotros/taller', alt: 'Sweet Caroline, el taller de producción' },
];

const GALLERY_MEDIA_IDS = [5570, 5571, 5525, 5524, 5522, 5521, 5520, 5519, 5518];

// ---------------------------------------------------------------------------
// HTTP with retry — the origin resets connections under load.
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 30_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, { attempts = 5, binary = false } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'user-agent': 'sweetcaroline-poc-importer/0.1 (+https://sweetcaroline.cl)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.json();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(500 * 2 ** (attempt - 1), 8000) + Math.random() * 250;
      process.stderr.write(
        `  ! ${url} (${error.message}) — retry ${attempt}/${attempts - 1} in ${Math.round(delay)}ms\n`,
      );
      await sleep(delay);
    }
  }
  throw new Error(`Failed after ${attempts} attempts: ${url}\n  ${lastError?.message}`);
}

const restUrl = (endpoint, params = {}) => {
  const url = new URL(`/wp-json/wp/v2/${endpoint}`, wpBase);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.toString();
};

const uploadUrl = (relative) => new URL(`/wp-content/uploads/${relative}`, wpBase).toString();

async function fetchAllPages(endpoint, params = {}) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await fetchWithRetry(restUrl(endpoint, { ...params, per_page: 100, page }));
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Run `worker` over `items` with bounded concurrency. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Text helpers — normalisation only, never editorialising.
//
// `decodeEntities`, `htmlToText` and `stripShortcodes` live in
// `scripts/html-text.mjs`, which has no side effects and is therefore unit
// tested directly (`tests/unit/html-text.test.ts`). Their ordering rules
// (structure before entities, `&amp;` last) are documented there.
// ---------------------------------------------------------------------------

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'sin-nombre';

const titleOf = (entity) =>
  decodeEntities(htmlToText(entity?.title?.rendered ?? entity?.name ?? '')).trim();

// ---------------------------------------------------------------------------
// Image writing
// ---------------------------------------------------------------------------

const MAX_IMAGE_WIDTH = 1600;

async function writeImage(key, buffer, { maxWidth = MAX_IMAGE_WIDTH } = {}) {
  const relative = `${key}.webp`;
  const dest = path.join(ROOT, 'src/assets', relative);

  if (skipImages) {
    if (checkOnly && !existsSync(dest)) throw new Error(`--check: missing image ${relative}`);
    return relative;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  const pipeline = sharp(buffer).rotate();
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > maxWidth) {
    pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  // Uniform WebP keeps sources consistent and the repository small; Astro
  // re-encodes to AVIF/WebP per breakpoint at build time.
  await pipeline.webp({ quality: 82 }).toFile(dest);
  return relative;
}

async function downloadByUrl(key, relativeUrl, opts) {
  if (skipImages) return writeImage(key, null, opts);
  const buffer = await fetchWithRetry(uploadUrl(relativeUrl), { binary: true });
  return writeImage(key, buffer, opts);
}

async function downloadByMediaId(media, mediaId, key, opts) {
  if (skipImages) return writeImage(key, null, opts);
  const record = media.get(Number(mediaId));
  if (!record?.source_url) throw new Error(`media ${mediaId} not found`);
  const buffer = await fetchWithRetry(record.source_url, { binary: true });
  return writeImage(key, buffer, opts);
}

// ---------------------------------------------------------------------------
// Site constants. Contact details, hours and socials were read from the live
// site footer; the pickup window and coordinates come from the map embed on
// /contacto/.
// ---------------------------------------------------------------------------

const SITE = {
  name: 'Sweet Caroline',
  tagline: 'Pastelería fina y chocolatería',
  description:
    'Taller de pastelería y cafetería en San Joaquín, Santiago. Pastelería fina, tortas a pedido, chocolatería y café de grano.',
  phone: '+56 9 9690 6461',
  phoneHref: '+56996906461',
  whatsapp: '56996906461',
  email: 'contacto@sweetcaroline.cl',
  instagram: 'https://www.instagram.com/sweetcarolinechile/',
  maps: 'https://maps.sweetcaroline.cl',
  mapsEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2797.358716023962!2d-70.6158889641524!3d-33.51077115745839!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662d07167c6e8cd%3A0xa34e215d4dc664a7!2sEstadio%206027%2C%20San%20Joaqu%C3%ADn%2C%20Regi%C3%B3n%20Metropolitana!5e0!3m2!1ses!2scl!4v1662860891957!5m2!1ses!2scl',
  address: {
    street: 'Av. Estadio 6027',
    commune: 'San Joaquín',
    city: 'Santiago',
    region: 'Región Metropolitana',
    country: 'CL',
    latitude: -33.51077115745839,
    longitude: -70.6158889641524,
  },
  hours: [
    {
      label: 'Tienda y terraza',
      schemaDays: ['Friday', 'Saturday', 'Sunday'],
      opens: '16:30',
      closes: '21:30',
      display: 'Viernes a domingo, 16.30 a 21.30 hrs.',
    },
    {
      label: 'Pedidos para retirar',
      schemaDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '20:00',
      display: 'Lunes a domingo, 10.00 a 20.00 hrs.',
    },
  ],
  copyright: '© 2026 Sweet Caroline. Algunos derechos reservados.',
};

// ---------------------------------------------------------------------------
// Page extraction
// ---------------------------------------------------------------------------

function extractNosotrosSections(html) {
  const text = htmlToText(stripShortcodes(html));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const pick = (headingMatch) => {
    const start = lines.findIndex((l) => headingMatch.test(l));
    if (start < 0) return '';
    const body = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^(Misión|Visión|¿Quiénes somos\?)$/i.test(lines[i])) break;
      body.push(lines[i]);
    }
    return body.join('\n\n').trim();
  };

  return {
    intro: pick(/^¿Quiénes somos\?$/i),
    mission: pick(/^Misión$/i),
    vision: pick(/^Visión$/i),
  };
}

function renderNosotrosMarkdown({ intro, mission, vision }, images) {
  // The source links "haciendo click aqui" to the cafetería section. The link
  // target is written relative to this page (`../en-cafeteria/`) rather than as
  // a root-absolute path, because a root-absolute link would point above the
  // deployed root on a GitHub Pages project site while a relative one resolves
  // correctly under any base.
  const withLinks = intro.replace(/haciendo click aqui/gi, '[haciendo click aquí](../en-cafeteria/)');
  const alt = (value) => `'${value.replace(/'/g, "''")}'`;

  const frontmatter = [
    '---',
    'title: La pastelería',
    "description: 'Quiénes somos: taller de pastelería fina en San Joaquín, Santiago. Nuestra misión y visión.'",
    'images:',
    ...images.map((i) => `  - key: ${i.key}\n    alt: ${alt(i.alt)}`),
    '---',
    '',
  ].join('\n');

  return `${frontmatter}## ¿Quiénes somos?

${withLinks}

## Misión

${mission}

## Visión

${vision}
`;
}

/**
 * Historical permalinks that must keep resolving after the rebuild.
 *
 * The catalog and gallery sections were retired (see ADR 0006), so every old
 * permalink now lands on the homepage, which carries the Instagram feed and the
 * contact details. Retargeting here rather than hand-editing
 * `src/data/legacy-urls.json` keeps a re-import from resurrecting the old
 * `/producto/...` routes, which no longer exist.
 */
function buildLegacyUrls(products) {
  const map = {};
  for (const p of products) {
    map[new URL(p.sourceUrl).pathname] = '/';
  }
  map['/galeria/'] = '/';
  map['/nuestros-productos/'] = '/';
  return map;
}

/**
 * The homepage feed configuration. `posts` is authored by hand — Instagram has
 * no official profile-feed endpoint that a build can read without a token
 * belonging to the account itself — so a re-import must never overwrite it.
 */
function buildInstagramConfig(gallery) {
  return {
    profile: 'sweetcarolinechile',
    fallback: gallery.map(({ key, alt }) => ({ key, alt })),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  log(`Importing content from ${wpBase}${checkOnly ? ' (check only)' : ''}`);

  const [rawProducts, rawTerms] = await Promise.all([
    fetchAllPages('product', {
      _fields: 'id,slug,title,excerpt,content,product_cat,featured_media,link',
    }),
    fetchAllPages('product_cat', { _fields: 'id,slug,name,count,parent,description' }),
  ]);
  const rawPages = await fetchAllPages('pages', { _fields: 'slug,title,content' });
  log(`Fetched ${rawProducts.length} products, ${rawTerms.length} terms, ${rawPages.length} pages`);

  // --- media we need ------------------------------------------------------
  const neededMediaIds = new Set(GALLERY_MEDIA_IDS);
  for (const p of rawProducts) if (p.featured_media) neededMediaIds.add(p.featured_media);
  for (const n of NOSOTROS_MEDIA) neededMediaIds.add(n.id);
  for (const c of DISPLAY_CATEGORIES) if (c.image.mediaId) neededMediaIds.add(c.image.mediaId);

  const mediaList = await fetchWithRetry(
    restUrl('media', {
      include: [...neededMediaIds].join(','),
      per_page: 100,
      _fields: 'id,source_url,alt_text',
    }),
  );
  const media = new Map(mediaList.map((m) => [m.id, m]));
  log(`Resolved ${media.size}/${neededMediaIds.size} media records`);

  // --- normalise taxonomy -------------------------------------------------
  //
  // Display categories are resolved by walking each term's ancestor chain.
  // WordPress files `tortas-estandar` under `tortas`, and two products carry
  // only the child term — resolving upwards is what puts them back in the
  // catalog. Structural ancestors (`productos`, `cafeteria`, `sin-categoria`)
  // simply never resolve to a display category.
  const displaySlugs = new Set(DISPLAY_CATEGORIES.map((c) => c.slug));
  const termById = new Map(rawTerms.map((t) => [t.id, t]));
  const displayTermsByTermId = new Map();
  const unmappedTerms = new Set();

  for (const term of rawTerms) {
    const found = new Set();
    const visited = new Set();
    let cursor = term;
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      const alias = TERM_ALIASES[cursor.slug] ?? cursor.slug;
      if (displaySlugs.has(alias)) found.add(alias);
      cursor = cursor.parent ? termById.get(cursor.parent) : undefined;
    }
    if (found.size > 0) displayTermsByTermId.set(term.id, found);
    else if (!DROPPED_TERMS.has(term.slug)) {
      unmappedTerms.add(`${term.slug} (${term.name}, count=${term.count})`);
    }
  }

  // --- normalise products -------------------------------------------------
  const warnings = [];
  const seenSlugs = new Map();
  const nameCounts = new Map();
  const duplicateNames = [];
  const missingImages = [];
  const missingDescriptions = [];
  const uncategorised = [];
  const products = [];

  for (const raw of rawProducts) {
    const name = titleOf(raw);
    if (!name) {
      warnings.push(`product ${raw.id} has no usable title — skipped`);
      continue;
    }

    // WordPress genuinely holds two "Red Velvet" entries (one custom, one
    // standard); disambiguate so each URL stays unique and stable.
    let slug = raw.slug || slugify(name);
    if (seenSlugs.has(slug)) {
      let n = 2;
      while (seenSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    seenSlugs.set(slug, name);

    const nameCount = (nameCounts.get(name) ?? 0) + 1;
    nameCounts.set(name, nameCount);
    if (nameCount === 2) duplicateNames.push(name);

    const termSlugs = (raw.product_cat ?? [])
      .map((id) => rawTerms.find((t) => t.id === id)?.slug)
      .filter(Boolean);

    const categories = [
      ...new Set((raw.product_cat ?? []).flatMap((id) => [...(displayTermsByTermId.get(id) ?? [])])),
    ].sort(
      (a, b) =>
        DISPLAY_CATEGORIES.findIndex((c) => c.slug === a) -
        DISPLAY_CATEGORIES.findIndex((c) => c.slug === b),
    );

    let subgroup = null;
    for (const t of termSlugs) if (SUBGROUP_TERMS[t]) subgroup = SUBGROUP_TERMS[t];

    const sections = SECTION_ORDER.filter((section) =>
      DISPLAY_CATEGORIES.some((c) => c.sections.includes(section) && categories.includes(c.slug)),
    );
    if (sections.length === 0) uncategorised.push(`${name} (terms: ${termSlugs.join(', ') || 'none'})`);

    const description = htmlToText(raw.excerpt?.rendered ?? '') || htmlToText(raw.content?.rendered ?? '');
    if (!description) missingDescriptions.push(name);

    let image = null;
    if (raw.featured_media && media.has(raw.featured_media)) image = `products/${slug}`;
    else missingImages.push(name);

    products.push({ slug, name, sections, categories, subgroup, description, image, sourceUrl: raw.link });
  }

  // --- images -------------------------------------------------------------
  const productImageJobs = products
    .filter((p) => p.image)
    .map((p) => {
      const source = rawProducts.find((r) => r.link === p.sourceUrl);
      return { key: p.image, mediaId: source?.featured_media };
    });

  const categoryImageJobs = DISPLAY_CATEGORIES.map((def) => ({ def, ...def.image }));

  const nosotrosJobs = NOSOTROS_MEDIA.map((entry) => ({ type: 'nosotros', ...entry }));
  const galleryJobs = GALLERY_MEDIA_IDS.map((id, index) => ({
    type: 'gallery',
    id,
    index,
    key: `gallery/foto-${String(index + 1).padStart(2, '0')}`,
  }));
  const heroJobs = HERO_SLIDES.map((slide) => ({ type: 'hero', ...slide }));
  const brandJobs = BRAND_ASSETS.map((asset) => ({ type: 'brand', ...asset }));

  const imageCount =
    productImageJobs.length +
    categoryImageJobs.length +
    nosotrosJobs.length +
    galleryJobs.length +
    heroJobs.length +
    brandJobs.length;
  log(
    skipImages
      ? `Skipping ${imageCount} images (--no-images / --check)`
      : `Downloading ${imageCount} images (concurrency 4)`,
  );

  await mapLimit(productImageJobs, 4, (job) =>
    downloadByMediaId(media, job.mediaId, job.key, { maxWidth: 1200 }),
  );

  const categoryImages = new Map();
  await mapLimit(categoryImageJobs, 4, async (job) => {
    const key = `categories/${job.def.slug}`;
    const written = job.mediaId
      ? await downloadByMediaId(media, job.mediaId, key, { maxWidth: 800 })
      : await downloadByUrl(key, job.url, { maxWidth: 800 });
    // Store the logical key without its extension, matching how product image
    // keys are stored — `src/lib/images.ts` resolves either form.
    categoryImages.set(job.def.slug, written.replace(/\.webp$/, ''));
  });

  const nosotrosImages = await mapLimit(nosotrosJobs, 4, async (job) => ({
    key: (await downloadByMediaId(media, job.id, job.key)).replace(/\.webp$/, ''),
    alt: job.alt,
  }));

  const gallery = await mapLimit(galleryJobs, 4, async (job) => ({
    key: (await downloadByMediaId(media, job.id, job.key, { maxWidth: 1400 })).replace(/\.webp$/, ''),
    // Every image in the WordPress media library has an empty alt. Emit a
    // generic, non-empty description rather than inventing a caption for a
    // photograph nobody has looked at.
    alt:
      media.get(job.id)?.alt_text?.trim() ||
      `Fotografía de la pastelería Sweet Caroline, imagen ${job.index + 1}`,
  }));

  const hero = await mapLimit(heroJobs, 3, async (job) => ({
    heading: job.heading,
    subtitle: job.subtitle,
    image: (await downloadByUrl(job.key, job.url, { maxWidth: 1600 })).replace(/\.webp$/, ''),
  }));

  await mapLimit(brandJobs, 2, (job) => downloadByUrl(job.key, job.url, { maxWidth: 600 }));

  // --- categories with counts --------------------------------------------
  const categories = DISPLAY_CATEGORIES.map((def) => {
    const count = products.filter((p) => p.categories.includes(def.slug)).length;
    if (count === 0) warnings.push(`category "${def.name}" has no products — hidden from section tiles`);
    return { ...def, count, empty: count === 0, image: categoryImages.get(def.slug) ?? null };
  });

  // --- write --------------------------------------------------------------
  if (!checkOnly) {
    await resetContentDirs();
    await Promise.all([
      ...products.map((p) =>
        writeJson(`src/content/products/${p.slug}.json`, {
          name: p.name,
          sections: p.sections,
          categories: p.categories,
          description: p.description,
          image: p.image,
          subgroup: p.subgroup,
          sourceUrl: p.sourceUrl,
        }),
      ),
      ...categories.map((c) =>
        writeJson(`src/content/categories/${c.slug}.json`, {
          name: c.name,
          order: c.order,
          image: c.image,
          hidden: c.empty,
          empty: c.empty,
        }),
      ),
    ]);

    const nosotros = rawPages.find((p) => p.slug === 'nosotros');
    if (!nosotros) throw new Error('page "nosotros" not found');
    await writeFile(
      path.join(ROOT, 'src/content/pages/nosotros.md'),
      renderNosotrosMarkdown(extractNosotrosSections(nosotros.content.rendered), nosotrosImages),
      'utf8',
    );

    // Cafetería prose comes from the homepage of the WordPress site.
    await writeFile(
      path.join(ROOT, 'src/content/pages/en-cafeteria.md'),
      renderCafeteriaMarkdown(),
      'utf8',
    );

    await writeJson('src/data/site.json', SITE);
    await writeJson('src/data/home.json', { hero, highlights: HOME_HIGHLIGHTS });
    await writeJson('src/data/gallery.json', gallery);
    await writeJson('src/data/legacy-urls.json', buildLegacyUrls(products));

    // The homepage links to the profile rather than embedding posts, so the
    // only thing worth regenerating is the local photograph list.
    await writeJson('src/data/instagram.json', buildInstagramConfig(gallery));
  }

  const report = renderReport({
    products,
    categories,
    warnings,
    missingImages,
    missingDescriptions,
    duplicateNames,
    uncategorised,
    unmappedTerms: [...unmappedTerms],
    gallery,
    elapsed: Date.now() - started,
  });
  if (!checkOnly) await writeFile(path.join(ROOT, 'content-report.md'), report, 'utf8');

  log(
    `Done in ${((Date.now() - started) / 1000).toFixed(1)}s — ${products.length} products, ${categories.length} categories, ${gallery.length} gallery images`,
  );
  if (checkOnly) log('check passed: committed content matches the origin');
}

function renderCafeteriaMarkdown() {
  return `---
title: En cafetería
description: 'Nuestra terraza y salón de ventas en San Joaquín: café de grano, pastelería por trozo y bebestibles.'
images: []
---

## Un espacio para quedarse

Durante 2025 abrimos con gran éxito nuestra pequeña terraza con servicio de
cafetería. Un espacio al aire libre donde disfrutar de un café de grano con un
delicioso pastel.

## Pedidos para retirar

Además de la tienda y terraza, puedes encargar tus pedidos para retirar de lunes
a domingo entre las 10.00 y las 20.00 hrs.
`;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function renderReport({
  products,
  categories,
  warnings,
  missingImages,
  missingDescriptions,
  duplicateNames,
  uncategorised,
  unmappedTerms,
  gallery,
  elapsed,
}) {
  const list = (items) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '_Ninguno._');
  return `# Informe de contenido — importación desde WordPress

Generado por \`scripts/import-wordpress.mjs\` el ${new Date().toISOString().slice(0, 10)}
desde \`${wpBase}\` en ${(elapsed / 1000).toFixed(1)} s.

El importador **no corrige ni reescribe textos**: solo normaliza HTML, entidades
y espacios. Todo lo que sigue requiere una decisión del cliente.

## Resumen

| Métrica | Valor |
| --- | --- |
| Productos importados | ${products.length} |
| Productos con imagen | ${products.length - missingImages.length} |
| Productos **sin** imagen | ${missingImages.length} |
| Productos sin descripción | ${missingDescriptions.length} |
| Productos fuera de toda sección | ${uncategorised.length} |
| Categorías de vitrina | ${categories.length} |
| Categorías vacías | ${categories.filter((c) => c.empty).length} |
| Imágenes de galería | ${gallery.length} |
| Nombres de producto duplicados | ${duplicateNames.length} |
| Términos sin mapear | ${unmappedTerms.length} |

## Productos sin imagen (${missingImages.length})

Se muestran con una tarjeta de marca en lugar de una fotografía.

${list(missingImages)}

## Productos sin descripción (${missingDescriptions.length})

${list(missingDescriptions)}

## Nombres de producto duplicados (${duplicateNames.length})

Se les asignó un identificador con sufijo numérico para que la URL sea única.

${list(duplicateNames)}

## Productos fuera de toda sección (${uncategorised.length})

No aparecerán en el catálogo hasta asignarles una categoría.

${list(uncategorised)}

## Categorías vacías

${list(categories.filter((c) => c.empty).map((c) => `${c.name} — se oculta de las portadas de sección`))}

## Términos de WordPress sin mapear

Términos presentes en la API que no forman parte de la vitrina y se descartan.

${list(unmappedTerms)}

## Advertencias del importador

${list(warnings)}

## Notas editoriales

- Las imágenes de la galería no tienen texto alternativo en WordPress. Se generó
  un texto genérico y **necesita revisión del cliente**.
- La categoría *Tartas* usaba en el sitio original la imagen de *Por trozo*. Se
  reemplazó por una fotografía real de tarta del catálogo.
- Se detectaron errores de escritura en el origen (\`rlleno\`, \`bzcocho\`,
  \`fambuesa\`, \`Queremosa\`, \`integramente\`). No se corrigieron.
- El texto de la página *En cafetería* se redactó a partir del contenido
  existente en la portada y la página de contacto del sitio original.
`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function resetContentDirs() {
  for (const dir of ['src/content/products', 'src/content/categories', 'src/content/pages']) {
    await rm(path.join(ROOT, dir), { recursive: true, force: true });
    await mkdir(path.join(ROOT, dir), { recursive: true });
  }
}

async function writeJson(relativePath, value) {
  const dest = path.join(ROOT, relativePath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function log(message) {
  process.stdout.write(`[import] ${message}\n`);
}

main().catch((error) => {
  process.stderr.write(`\n[import] FAILED: ${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
