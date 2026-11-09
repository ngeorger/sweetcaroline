import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// `SITE_URL` / `BASE_PATH` let one config serve both the project-page preview
// (https://<owner>.github.io/sweetcaroline/) and the apex domain
// (https://sweetcaroline.cl) without touching source.
const site = process.env.SITE_URL ?? 'https://sweetcaroline.cl';

// Default `base` to the path component of `site`, so a project-page deploy
// cannot silently emit root-absolute asset URLs again. GitHub Pages serves a
// project site under `/<repo>/`, and a build with `base: '/'` produces
// `/_astro/...` paths that 404 there — every stylesheet, font, image and
// internal link breaks. Deriving one from the other makes them impossible to
// drift apart. An explicit `BASE_PATH` still wins for edge cases.
const sitePath = new URL(site).pathname.replace(/\/$/, '');
const base = process.env.BASE_PATH ?? (sitePath || '/');

// Indexing policy, mirroring `src/lib/indexing.ts`. A sitemap is an explicit
// invitation to crawl, so while the preview is meant to stay unlisted the
// sitemap lists nothing. Set `ALLOW_INDEXING=1` at cutover to publish it.
const allowIndexing = process.env.ALLOW_INDEXING === '1';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Inline small stylesheets rather than emitting a render-blocking request.
    inlineStylesheets: 'auto',
  },
  image: {
    // sharp is a direct dependency; make the service explicit.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  integrations: [
    sitemap({
      // While the preview must stay unlisted the sitemap lists nothing at all.
      // The legacy redirect stubs cannot appear regardless: Astro's sitemap
      // integration only sees pages it rendered, and `scripts/emit-redirects.mjs`
      // writes its stubs afterwards, straight into `dist/`.
      filter: () => allowIndexing,
    }),
  ],
  // Poppins is the existing brand typeface (the WordPress theme loads it from
  // Google Fonts at runtime). Astro downloads and self-hosts it at build time,
  // which removes a render-blocking third-party request and keeps visitor data
  // away from Google.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      weights: [400, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
