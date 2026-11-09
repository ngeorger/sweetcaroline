#!/usr/bin/env node
/**
 * Generate the brand assets that are not part of the WordPress import:
 * the rasterised touch icon and the Open Graph card.
 *
 * These are build inputs committed to `public/`, regenerated only when the
 * brand changes:
 *
 *   node scripts/generate-brand-assets.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BRAND = '#e6007e';
const BRAND_DARK = '#b20065';

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${BRAND}"/>
  <g fill="#ffffff">
    <ellipse cx="16" cy="9.4" rx="3.1" ry="4.4"/>
    <ellipse cx="16" cy="22.6" rx="3.1" ry="4.4"/>
    <ellipse cx="9.4" cy="16" rx="4.4" ry="3.1"/>
    <ellipse cx="22.6" cy="16" rx="4.4" ry="3.1"/>
  </g>
  <circle cx="16" cy="16" r="3.1" fill="${BRAND}"/>
</svg>`;

/** 1200x630 Open Graph card — the size Facebook, WhatsApp and X expect. */
const OG_CARD = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND}"/>
      <stop offset="55%" stop-color="${BRAND}"/>
      <stop offset="100%" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <!-- Soft radial highlight so the flat magenta does not read as a solid block. -->
  <ellipse cx="600" cy="230" rx="520" ry="300" fill="#ffffff" opacity="0.07"/>
</svg>`;

/**
 * Scalloped band that closes the card, echoing the site header.
 * Drawn as explicit circles: a stretched path would distort them.
 */
function scallopBand({ width = 1200, size = 48, height = 24, color = '#ffffff' }) {
  const count = Math.ceil(width / size);
  const circles = Array.from(
    { length: count },
    (_, i) => `<circle cx="${i * size + size / 2}" cy="0" r="${size / 2 - 2}" fill="${color}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${circles}</svg>`;
}

async function main() {
  const publicDir = path.join(ROOT, 'public');
  await mkdir(publicDir, { recursive: true });

  await writeFile(path.join(publicDir, 'favicon.svg'), `${FAVICON}\n`, 'utf8');

  await sharp(Buffer.from(FAVICON))
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Compose the card from the real brand logo instead of rendering text:
  // sharp's SVG text needs fontconfig, which is not guaranteed to be present
  // wherever this script runs. The logo already carries the wordmark.
  const logoPath = path.join(ROOT, 'src/assets/brand/logo-blanco.webp');
  const logo = await sharp(logoPath).resize({ width: 440 }).toBuffer();

  const band = await sharp(Buffer.from(scallopBand({}))).png().toBuffer();

  await sharp(Buffer.from(OG_CARD))
    .composite([
      { input: logo, gravity: 'center' },
      { input: band, gravity: 'southwest' },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'og-image.png'));

  process.stdout.write('[brand] wrote favicon.svg, apple-touch-icon.png, og-image.png\n');
}

main().catch((error) => {
  process.stderr.write(`[brand] FAILED: ${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
