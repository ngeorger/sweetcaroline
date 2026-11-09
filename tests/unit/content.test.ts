/**
 * Content integrity.
 *
 * These tests guard the real, observed defects in the imported data rather
 * than hypothetical ones: categories that do not resolve, products that would
 * land in no section at all, and image keys pointing at files that are not on
 * disk. They run against the committed content, so a bad re-import fails CI
 * instead of silently producing a broken site.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = path.join(ROOT, 'src/content');
const ASSETS = path.join(ROOT, 'src/assets');

const readJsonDir = (dir: string) =>
  readdirSync(path.join(CONTENT, dir))
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({
      id: file.replace(/\.json$/, ''),
      ...JSON.parse(readFileSync(path.join(CONTENT, dir, file), 'utf8')),
    }));

const products = readJsonDir('products');
const categories = readJsonDir('categories');
const site = JSON.parse(readFileSync(path.join(ROOT, 'src/data/site.json'), 'utf8'));
const gallery = JSON.parse(readFileSync(path.join(ROOT, 'src/data/gallery.json'), 'utf8'));
const instagram = JSON.parse(readFileSync(path.join(ROOT, 'src/data/instagram.json'), 'utf8'));
const legacyUrls = JSON.parse(readFileSync(path.join(ROOT, 'src/data/legacy-urls.json'), 'utf8'));

const categorySlugs = new Set(categories.map((c) => c.id));
const assetExists = (key: string) =>
  ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg'].some((ext) =>
    existsSync(path.join(ASSETS, `${key}.${ext}`)),
  );

describe('catalog shape', () => {
  it('imports the full WordPress catalog', () => {
    // 62 products in the source API.
    expect(products).toHaveLength(62);
  });

  it('exposes the eight display categories in a stable order', () => {
    // Ordering is by the explicit `order` field, not by directory listing.
    const byOrder = [...categories].sort((a, b) => a.order - b.order).map((c) => c.id);
    expect(byOrder).toEqual([
      'tortas',
      'confites',
      'pasteles',
      'tartas',
      'postres',
      'individuales',
      'por-trozo',
      'bebestibles',
    ]);
  });

  it('gives every category a unique order value', () => {
    const orders = categories.map((c) => c.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe('referential integrity', () => {
  it('resolves every product category to a known category', () => {
    const dangling: string[] = [];
    for (const product of products) {
      for (const slug of product.categories) {
        if (!categorySlugs.has(slug)) dangling.push(`${product.name} -> ${slug}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('places every product in at least one display section', () => {
    // Two products in the source carry only a child term, which is exactly the
    // bug the ancestor walk in the importer fixes.
    const orphans = products.filter((p) => p.sections.length === 0).map((p) => p.name);
    expect(orphans).toEqual([]);
  });

  it('places every product in at least one category', () => {
    const uncategorised = products.filter((p) => p.categories.length === 0).map((p) => p.name);
    expect(uncategorised).toEqual([]);
  });

  it('uses only known section names', () => {
    const allowed = new Set(['productos', 'cafeteria']);
    const bad = products.flatMap((p) => p.sections.filter((s: string) => !allowed.has(s)));
    expect(bad).toEqual([]);
  });

  it('uses only known subgroup names', () => {
    const allowed = new Set([null, 'personalizadas', 'estandar', 'diabeticos']);
    const bad = products.map((p) => p.subgroup).filter((s) => !allowed.has(s));
    expect(bad).toEqual([]);
  });
});

describe('image references', () => {
  it('resolves every product image key to a file on disk', () => {
    const missing = products
      .filter((p) => p.image && !assetExists(p.image))
      .map((p) => `${p.name} -> ${p.image}`);
    expect(missing).toEqual([]);
  });

  it('resolves every category image key to a file on disk', () => {
    const missing = categories
      .filter((c) => c.image && !assetExists(c.image))
      .map((c) => `${c.name} -> ${c.image}`);
    expect(missing).toEqual([]);
  });

  it('resolves every gallery image key to a file on disk', () => {
    const missing = (gallery as { key: string }[])
      .filter((g) => !assetExists(g.key))
      .map((g) => g.key);
    expect(missing).toEqual([]);
  });

  it('resolves every fallback photo to a file on disk', () => {
    // The homepage uses the first of these as its Open Graph image, so a stale
    // key would leave the page without a social preview.
    const missing = (instagram.fallback as { key: string }[])
      .filter((photo) => !assetExists(photo.key))
      .map((photo) => photo.key);
    expect(missing).toEqual([]);
  });
});

describe('data quality', () => {
  it('never ships an empty accessible name for a gallery photo', () => {
    const empty = gallery.filter((g: { alt: string }) => !g.alt?.trim());
    expect(empty).toEqual([]);
  });

  it('never ships an empty accessible name for a fallback photo', () => {
    const empty = (instagram.fallback as { alt: string }[]).filter(
      (photo) => !photo.alt?.trim(),
    );
    expect(empty).toEqual([]);
  });

  it('keeps exactly the documented number of products without a photograph', () => {
    // 39 of the 62 products have a featured image in WordPress.
    expect(products.filter((p) => !p.image)).toHaveLength(23);
  });

  it('gives every product a non-empty name and a source URL', () => {
    const bad = products.filter((p) => !p.name?.trim() || !p.sourceUrl?.startsWith('http'));
    expect(bad).toEqual([]);
  });

  it('documents the two products that have no description', () => {
    const undocumented = products.filter((p) => !p.description?.trim()).map((p) => p.name).sort();
    expect(undocumented).toEqual(['Crema fambuesa', 'Tarta de manzana']);
  });

  it('assigns a unique slug to both "Red Velvet" entries', () => {
    const redVelvet = products.filter((p) => p.name === 'Red Velvet').map((p) => p.id).sort();
    expect(redVelvet).toEqual(['red-velvet', 'red-velvet-2']);
  });
});

describe('site configuration', () => {
  it('carries the E.164 phone number that schema.org requires', () => {
    expect(site.phoneHref).toBe('+56996906461');
    expect(site.whatsapp).toBe('56996906461');
  });

  it('keeps the opening-hours ranges the current site publishes', () => {
    expect(site.hours).toHaveLength(2);
    const terrace = site.hours.find((h: { label: string }) => h.label === 'Tienda y terraza');
    expect(terrace.opens).toBe('16:30');
    expect(terrace.closes).toBe('21:30');
  });

  it('provides valid coordinates for the map and JSON-LD', () => {
    expect(site.address.latitude).toBeLessThan(0);
    expect(site.address.longitude).toBeLessThan(0);
  });
});

describe('legacy URLs', () => {
  it('keeps a redirect for every product permalink', () => {
    // The product pages were retired; the old permalinks must still lead
    // somewhere useful rather than 404.
    for (const product of products) {
      const path = new URL(product.sourceUrl).pathname;
      expect(legacyUrls[path], `${path} should be redirected`).toBe('/');
    }
  });

  it('keeps the old section and gallery roots redirected', () => {
    expect(legacyUrls['/nuestros-productos/']).toBe('/');
    expect(legacyUrls['/galeria/']).toBe('/');
  });

  it('points every entry at the homepage, which is the only remaining target', () => {
    const bad = Object.entries(legacyUrls).filter(
      ([from, to]) => !(from as string).startsWith('/') || to !== '/',
    );
    expect(bad).toEqual([]);
  });
});
