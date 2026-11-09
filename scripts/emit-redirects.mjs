#!/usr/bin/env node
/**
 * Emit redirect stubs for historical URLs.
 *
 * GitHub Pages serves static files only — it cannot issue a 301. The next best
 * thing is a small HTML page carrying `<meta http-equiv="refresh">` plus a
 * `rel="canonical"` pointing at the new location, which search engines follow
 * and browsers honour immediately.
 *
 * Run after `astro build`:
 *
 *   node scripts/emit-redirects.mjs
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const site = (process.env.SITE_URL ?? 'https://sweetcaroline.cl').replace(/\/$/, '');

// Mirror the derivation in `astro.config.mjs`: a project-page deploy serves
// under `/<repo>/`, so the canonical target must carry that prefix too or the
// stub points one level too high.
const sitePath = (() => {
  try {
    return new URL(site).pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
})();
const base = (process.env.BASE_PATH ?? sitePath) || '';
const prefix = base === '/' ? '' : base;

// Mirrors src/lib/indexing.ts: blocking is the default.
const allowIndexing = process.env.ALLOW_INDEXING === '1';

/** Escape a string for safe interpolation into HTML text/attribute context. */
const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function stub(to) {
  // `site` already carries the project-page base (it comes from SITE_URL), so
  // the absolute target is just site + path. Adding `prefix` here would produce
  // `/sweetcaroline/sweetcaroline/...`.
  const target = `${site}${to}`;
  const safe = escapeHtml(target);
  // The visible link is an absolute path, so it needs the base explicitly.
  const safeTo = escapeHtml(`${prefix}${to}`);

  // Mirrors src/lib/indexing.ts. `nofollow` rather than `follow`: while the
  // preview must stay unlisted, a stub should not send crawlers onward either.
  const robots = allowIndexing
    ? 'noindex, follow'
    : 'noindex, nofollow, noarchive, nosnippet, noimageindex';

  return `<!doctype html>
<html lang="es-CL">
  <head>
    <meta charset="utf-8">
    <title>Redirigiendo… | Sweet Caroline</title>
    <link rel="canonical" href="${safe}">
    <meta name="robots" content="${robots}">
    <meta http-equiv="X-Robots-Tag" content="${robots}">
    <meta http-equiv="refresh" content="0; url=${safe}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <p>Esta página se trasladó. <a href="${safeTo}">Ir a la nueva dirección</a>.</p>
  </body>
</html>
`;
}

async function main() {
  const mapPath = path.join(ROOT, 'src/data/legacy-urls.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));

  // A stub must never shadow a page the new site actually builds.
  const isBuilt = async (route) => {
    try {
      await access(path.join(DIST, route.replace(/^\//, ''), 'index.html'));
      return true;
    } catch {
      return false;
    }
  };

  let written = 0;
  let skipped = 0;
  let mirrors = 0;

  for (const [from, to] of Object.entries(map)) {
    if (from === to || from === '/') continue;

    const normalizedFrom = from.endsWith('/') ? from : `${from}/`;
    if (await isBuilt(normalizedFrom)) {
      skipped++;
      continue;
    }

    const dest = path.join(DIST, normalizedFrom.replace(/^\//, ''), 'index.html');
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, stub(to), 'utf8');
    written++;

    // Also emit a sibling `<route>.html`. Static hosts disagree about slash
    // handling: GitHub Pages resolves `/foo` to `/foo/index.html` with a 301,
    // while some others (including `astro preview`) simply 404. The mirror file
    // makes the legacy URL work on both, and is harmlessly shadowed by the
    // directory form wherever that redirect does happen.
    const mirror = path.join(DIST, `${normalizedFrom.replace(/\/$/, '')}.html`);
    await mkdir(path.dirname(mirror), { recursive: true });
    await writeFile(mirror, stub(to), 'utf8');
    mirrors++;
  }

  process.stdout.write(
    `[redirects] wrote ${written} stub(s) + ${mirrors} extensionless mirror(s), skipped ${skipped} already built\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[redirects] FAILED: ${error?.stack ?? error}\n`);
  process.exitCode = 1;
});
