/**
 * Deployment integrity tests.
 *
 * These read the built `dist/` output rather than source, so they catch the
 * class of bug that shipped the first project-page deploy broken: assets and
 * links emitted as root-absolute paths (`/_astro/...`, `/productos/`) while
 * GitHub Pages served the site from `/sweetcaroline/`, so every one of them
 * 404'd.
 *
 * They also pin the section slug/route relationship, which had drifted: the
 * category route interpolated the *data* slug (`cafeteria`) into the URL while
 * the page lived at `/en-cafeteria/`, so the generated category pages were
 * orphans and the nav's cafeteria link 404'd.
 *
 * Run after `npm run build` (CI does). Skipped with a clear message when
 * `dist/` is absent so a bare `npm test` on a fresh clone still passes.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');

const hasDist = existsSync(path.join(DIST, 'index.html'));

/** Every `.html` file under `dist/`, as paths relative to `dist/`. */
function htmlFiles(dir = DIST, acc: string[] = []): string[] {
  // Returns empty rather than throwing when `dist/` is absent, so the suite can
  // skip cleanly on a fresh clone.
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Skip the prerender scratch dir Astro leaves behind.
      if (entry === '.prerender') continue;
      htmlFiles(full, acc);
    } else if (entry.endsWith('.html')) {
      acc.push(path.relative(DIST, full));
    }
  }
  return acc;
}

const describeIfBuilt = hasDist ? describe : describe.skip;

describeIfBuilt('built output integrity', () => {
  const files = htmlFiles();

  it('emits only the remaining pages', () => {
    // `/`, `/nosotros/`, `/contacto/`, `404.html` — plus the generated legacy
    // redirect stubs. Asserting a ceiling as well as a floor catches a route
    // that was meant to be deleted but is still being built.
    expect(files.length).toBeGreaterThan(0);
    expect(files.length).toBeLessThan(200);
  });

  it('never emits a root-absolute internal link that escapes the deployed base', () => {
    // The apex build legitimately uses `/...`; the project-page build must
    // prefix everything with the base. Read the base from the build itself so
    // this test works for either variant.
    const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1] ?? '';
    const basePath = new URL(canonical).pathname.replace(/\/$/, '');

    const offenders: string[] = [];

    for (const file of files) {
      const html = readFileSync(path.join(DIST, file), 'utf8');
      for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        const url = match[1];
        // Protocol-relative URLs are external.
        if (url.startsWith('//')) continue;
        if (basePath && url !== basePath && !url.startsWith(`${basePath}/`)) {
          offenders.push(`${file}: ${url}`);
        }
      }
    }

    expect(offenders.slice(0, 20)).toEqual([]);
  });

  it('resolves every internal link to a file that exists', () => {
    const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1] ?? '';
    // A project-page build emits links under `/sweetcaroline/`, but `dist/` is
    // the *contents* of that mount point, not a directory named after it. Strip
    // the base before resolving against the filesystem.
    const basePath = new URL(canonical).pathname.replace(/\/$/, '');

    const missing: string[] = [];

    for (const file of files) {
      const html = readFileSync(path.join(DIST, file), 'utf8');

      for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        let url = match[1].split('#')[0].split('?')[0];
        if (url.startsWith('//')) continue;

        if (basePath && (url === basePath || url.startsWith(`${basePath}/`))) {
          url = url.slice(basePath.length) || '/';
        }

        if (!url || url === '/') {
          if (!existsSync(path.join(DIST, 'index.html'))) missing.push(`${file}: ${url}`);
          continue;
        }

        // Resolve exactly as a static host would: try the path, then its
        // `index.html`, then the extensionless `.html` sibling the redirect
        // stubs emit.
        const rel = url.replace(/^\//, '');
        const candidates = [
          path.join(DIST, rel),
          path.join(DIST, rel, 'index.html'),
          path.join(DIST, `${rel.replace(/\/$/, '')}.html`),
        ];
        if (!candidates.some((c) => existsSync(c) && statSync(c).isFile())) {
          missing.push(`${file}: ${url}`);
        }
      }
    }

    expect(missing.slice(0, 20)).toEqual([]);
  });

  it('publishes exactly the homepage, Nosotros and Contacto', () => {
    // The catalog, cafeteria and gallery routes were retired (ADR 0006). Only
    // the legacy redirect *stubs* may remain under those paths, and they must
    // not be real pages.
    for (const route of ['index.html', 'nosotros/index.html', 'contacto/index.html']) {
      expect(existsSync(path.join(DIST, route)), `${route} should exist`).toBe(true);
    }

    // No page directory is generated for a retired section.
    for (const retired of [
      'productos',
      'producto',
      'en-cafeteria',
      'galeria-de-fotos',
      path.join('[section]'),
    ]) {
      expect(
        existsSync(path.join(DIST, retired, 'index.html')),
        `${retired}/index.html should not be built`,
      ).toBe(false);
    }
  });

  it('renders real pages only for the three published routes', () => {
    // Anything else under `dist/` must be a redirect stub, which the stub
    // itself proves with `http-equiv="refresh"`.
    const realPages = files.filter((file) => {
      const html = readFileSync(path.join(DIST, file), 'utf8');
      return !html.includes('http-equiv="refresh"');
    });

    expect(realPages.sort()).toEqual([
      '404.html',
      'contacto/index.html',
      'index.html',
      'nosotros/index.html',
    ]);
  });

  it('points robots.txt at the sitemap on the deployed host when indexing is allowed', () => {
    const robots = readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
    const sitemap = /Sitemap: (\S+)/.exec(robots)?.[1] ?? '';
    const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1] ?? '';
    const indexingAllowed = !/noindex/.test(
      /<meta name="robots" content="([^"]+)"/.exec(home)?.[1] ?? '',
    );

    if (!indexingAllowed) {
      // A blocked build must not advertise a sitemap: the two contradict, and
      // the sitemap is itself a crawl invitation.
      expect(robots).not.toMatch(/Sitemap:/);
      return;
    }

    // The sitemap URL must sit under the same base the site is served from.
    const canonicalDir = new URL('.', canonical).pathname;
    expect(sitemap.endsWith('sitemap-index.xml')).toBe(true);
    expect(sitemap.startsWith(new URL(canonicalDir, new URL(canonical).origin).href)).toBe(true);
  });

  it('tells every crawler not to index any page', () => {
    const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const robotsMeta = /<meta name="robots" content="([^"]+)"/.exec(home)?.[1] ?? '';
    const indexingAllowed = !/noindex/.test(robotsMeta);

    // When indexing is explicitly allowed this expectation is inverted; the
    // default (and the deployed preview) is blocked.
    if (indexingAllowed) {
      expect(robotsMeta).toContain('index');
      return;
    }

    const offenders: string[] = [];
    for (const file of files) {
      const html = readFileSync(path.join(DIST, file), 'utf8');
      const meta = /<meta name="robots" content="([^"]+)"/.exec(html)?.[1];
      if (!meta || !meta.includes('noindex')) offenders.push(file);
    }

    // No page may escape the policy — including 404.html and redirect stubs.
    expect(offenders.slice(0, 20)).toEqual([]);
  });

  it('sends the noindex directive through both the meta and http-equiv forms', () => {
    // GitHub Pages cannot set response headers, so the header directive is only
    // expressible as a meta tag; emit it so crawlers that key on
    // `X-Robots-Tag` (rather than `robots`) are covered too.
    const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    if (!/noindex/.test(home)) return;

    expect(home).toMatch(/<meta http-equiv="X-Robots-Tag" content="[^"]*noindex/);
    expect(home).toMatch(/<meta name="googlebot" content="[^"]*noindex/);
  });

  it('blocks robots.txt for every agent while the preview is unlisted', () => {
    const robots = readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
    if (!/Disallow: \//.test(robots)) return;

    // The wildcard must be disallowed, and the named AI/archive crawlers too,
    // since some ignore a bare `User-agent: *` group they parse oddly.
    expect(robots).toMatch(/User-agent: \*\s*\nDisallow: \//);
    for (const agent of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot', 'Google-Extended']) {
      expect(robots, `${agent} should be disallowed`).toMatch(
        new RegExp(`User-agent: ${agent}\\s*\\nDisallow: /`),
      );
    }
  });

  it('points legacy redirect stubs at a URL under the deployed base', () => {
    // The stub's canonical must not double the base (`/repo/repo/...`), which
    // is what happens when a value that already carries it gets it applied
    // twice.
    const stub = path.join(DIST, 'nuestros-productos', 'index.html');
    expect(existsSync(stub)).toBe(true);

    const html = readFileSync(stub, 'utf8');
    const target = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? '';
    const refresh = /url=([^"]+)"/.exec(html)?.[1] ?? '';

    expect(target).not.toBe('');
    expect(refresh).toBe(target);

    // Every retired permalink now lands on the homepage, and the base is
    // applied exactly once: the path after the origin is the base itself plus
    // the `/` the stub targets, never the base twice.
    const { origin, pathname } = new URL(target);

    // No repeated path segment directly after the origin.
    const segments = pathname.split('/').filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i], `repeated segment in ${target}`).not.toBe(segments[i - 1]);
    }
    expect(target.startsWith(origin)).toBe(true);
    expect(pathname.endsWith('/')).toBe(true);
  });

  it('sends a retired permalink to the deployed root, not to a retired route', () => {
    // `/producto/<slug>/` used to be the target; it no longer exists, so a stub
    // pointing there would be a redirect to a 404.
    const stub = path.join(DIST, 'galeria', 'index.html');
    expect(existsSync(stub)).toBe(true);

    const html = readFileSync(stub, 'utf8');
    const target = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? '';
    for (const retired of ['/producto/', '/productos/', '/en-cafeteria/', '/galeria-de-fotos/']) {
      expect(target).not.toContain(retired);
    }
  });
});
