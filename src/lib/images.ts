import type { ImageMetadata } from 'astro';

/**
 * Content JSON stores logical image keys (e.g. `products/macarons`) rather
 * than file paths, so that the content layer stays decoupled from the asset
 * directory layout and a renamed file cannot silently break a product.
 *
 * Every image under `src/assets` is eagerly imported here so Astro's asset
 * pipeline can optimise each one at build time.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{webp,avif,png,jpg,jpeg,svg}',
  { eager: true },
);

const byKey = new Map<string, ImageMetadata>();
for (const [filePath, module] of Object.entries(modules)) {
  const key = filePath.replace('/src/assets/', '').replace(/\.[^./]+$/, '');
  byKey.set(key, module.default);
}

/** Resolve an image key to its metadata, or `undefined` when absent. */
export function getImage(key: string | null | undefined): ImageMetadata | undefined {
  if (!key) return undefined;
  return byKey.get(key);
}

/**
 * Resolve an image key, throwing when it is missing. Used where a missing
 * asset is a build-breaking content error rather than a display fallback.
 */
export function requireImage(key: string): ImageMetadata {
  const image = getImage(key);
  if (!image) throw new Error(`Unknown image key: "${key}"`);
  return image;
}

export function hasImage(key: string | null | undefined): boolean {
  return getImage(key) !== undefined;
}

/** All known image keys — used by the content integrity test. */
export function imageKeys(): string[] {
  return [...byKey.keys()];
}
