/**
 * Instagram profile configuration.
 *
 * The homepage links out to the profile instead of embedding the feed, so the
 * only thing that can silently break here is the handle drifting from the one
 * the rest of the site links to, or the metadata photograph going missing.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS = path.join(ROOT, 'src/assets');
const site = JSON.parse(readFileSync(path.join(ROOT, 'src/data/site.json'), 'utf8'));
const instagram = JSON.parse(
  readFileSync(path.join(ROOT, 'src/data/instagram.json'), 'utf8'),
) as {
  profile: string;
  fallback: { key: string; alt: string }[];
};

const assetExists = (key: string) =>
  ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg'].some((ext) =>
    existsSync(path.join(ASSETS, `${key}.${ext}`)),
  );

describe('instagram profile', () => {
  it('points at the same profile the rest of the site links to', () => {
    // site.json drives the header, footer, contact page and JSON-LD `sameAs`;
    // a divergent handle here would send visitors to the wrong account.
    expect(site.instagram).toBe(`https://www.instagram.com/${instagram.profile}/`);
  });

  it('ships a fallback photograph that exists on disk', () => {
    // The homepage uses the first entry as its Open Graph image, which has to
    // be a local asset: `astro:assets` cannot optimise a remote file.
    expect(instagram.fallback.length).toBeGreaterThan(0);
    const missing = instagram.fallback.filter((photo) => !assetExists(photo.key));
    expect(missing.map((photo) => photo.key)).toEqual([]);
  });

  it('gives every fallback photograph a non-empty alt', () => {
    expect(instagram.fallback.filter((photo) => !photo.alt.trim())).toEqual([]);
  });
});
