# AGENTS.md — operating guide

Sweet Caroline is a **static Astro 7 site** that replaces an older WordPress/WPBakery
site. It builds to a single deployable artifact (`dist/`) with no server, no database
and no runtime configuration. Everything is resolved at build time.

Human-facing docs: [`README.md`](README.md) (Spanish) and [`docs/adr/`](docs/adr/)
(the *why* behind each architectural decision). Read those two before proposing a
structural change — most obvious "improvements" here are settled decisions.

## Layout

```
astro.config.mjs        site URL, base derivation, sitemap, fonts, Tailwind
src/content.config.ts   Zod schemas for the content collections
src/content/            imported content: products/*.json, categories/*.json, pages/*.md
src/data/               navigation.ts, site.json, home.json, gallery.json, instagram.json,
                        legacy-urls.json
src/lib/                images.ts, seo.ts, site.ts, indexing.ts
src/layouts/            BaseLayout.astro — head, SEO, JSON-LD, header, footer
src/components/         reusable UI
src/pages/              routes
src/styles/global.css   brand tokens
scripts/                import-wordpress.mjs, wp-base.mjs, html-text.mjs, emit-redirects.mjs, generate-brand-assets.mjs
tests/unit/             Vitest — content, deploy integrity, instagram, wp-base, html-text
tests/e2e/              Playwright + axe-core
docs/adr/               architecture decision records
```

## Commands

| Command | Notes |
| --- | --- |
| `npm run dev` | Dev server on :4321 |
| `npm run build` | `astro build` **then** `scripts/emit-redirects.mjs` — the redirect stubs are part of the artifact |
| `npm run preview` | Serves the built `dist/` |
| `npm run check` | `astro sync && tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright, desktop + mobile projects |
| `npm run content:import` | Manual, network-bound, **never in CI** |
| `npm run content:check` | Same importer, writes nothing |
| `npm run redirects` | Stubs alone |

### The homepage Instagram link

`/` is a call to action, not a feed: an introduction plus a "Ver el perfil en
Instagram" button to `https://www.instagram.com/sweetcarolinechile/`, then the
shared contact strip. It embeds nothing — no `embed.js`, no `<blockquote>`, no
iframe — so no request reaches `instagram.com` until a visitor clicks. The client
asked for exactly this; the post-embed design that preceded it is explained in
ADR 0006 and recoverable from git.

`src/data/instagram.json` holds `profile` and `fallback` only. Nothing renders
the photographs; the first one is the Open Graph image, which must be a local
asset because `astro:assets` cannot optimise a remote file. The importer
regenerates that file from the WordPress gallery.

If asked to show posts again, restore both the data list *and* the component —
and re-read ADR 0006 first, including the `x-frame-options: DENY` caveat that
made the embeds unreliable.

### Ordering

`tests/unit/deploy.test.ts` asserts against the built `dist/`, so **build before
unit tests**. CI enforces that order; do not reorder it back.

### Running e2e on this machine

**Run e2e against the apex build.** `astro preview` always serves `dist/` at `/`, so a
project-page build (`base: '/sweetcaroline'`) is served at the wrong root: the CSS and
fonts 404 and every page renders unstyled. The symptom is misleading — axe reports
`target-size` violations on the nav and the mobile overflow checks fail, which looks
like a CSS regression rather than a build/serve mismatch. `npm run build` (no
`SITE_URL`) is what the suite expects.

Playwright's browsers cannot launch on this host (missing `libnspr4.so`). Run them
in the official image instead — `package.json` pins `@playwright/test` 1.64.0, so
match the tag:

```bash
npm run build   # apex variant — see above
docker run --rm --ipc=host -v "$PWD":/work -w /work \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  mcr.microsoft.com/playwright:v1.64.0-noble \
  bash -lc 'npx astro preview --host 127.0.0.1 --port 4321 >/dev/null 2>&1 & sleep 8;
            BASE_URL=http://127.0.0.1:4321 npx playwright test --reporter=list'
```

The container only serves the existing `dist/`, so build first. Passing `BASE_URL`
makes `playwright.config.ts` skip its own `webServer`, so the preview is started
explicitly above.

`astro preview` writes a lock to `.astro/preview.json` and refuses to start if one
is present. That file is gitignored, but a killed container leaves it behind with a
`pid` that means nothing on the host, so a later run inside a *new* container can
fail with "Another astro preview server is already running". Delete
`.astro/preview.json` when that happens.

## Environment variables

No variable is read at runtime — they are consumed by the build or by the importer.

| Variable | Purpose | Default | Used by |
| --- | --- | --- | --- |
| `WORDPRESS_BASE_URL` | WordPress origin that seeds `src/content/**` | **none — hard failure** | `content:import`, `content:check` |
| `SITE_URL` | Public URL of this build; `base` is derived from its path | `https://sweetcaroline.cl` | build, `redirects` |
| `BASE_PATH` | Overrides the derived `base` | path of `SITE_URL` | build, `redirects` |
| `ALLOW_INDEXING` | `1` publishes the sitemap and `index, follow` | unset = blocked | build, `redirects` |

`cp .env.example .env` and the content scripts pick it up (`node
--env-file-if-exists=.env`). Shell values win over the file. `WORDPRESS_BASE_URL`
has no default **on purpose**: an unconfigured import must fail before touching the
network rather than quietly read production. See `scripts/wp-base.mjs`.

## Hard rules

1. **Never invent, rewrite or spell-correct imported copy.** The importer normalises
   markup, HTML entities and whitespace only. Typos, missing descriptions and missing
   photos are reported in `content-report.md` for the client to decide.
2. **`base` stays derived from `SITE_URL`.** A project-page deploy serves under
   `/<repo>/`, and a build with `base: '/'` emits `/_astro/...` and `/nosotros/` links
   that 404 there — a site with no styles and dead navigation. Deriving one from the
   other makes drift impossible. `BASE_PATH` is an escape hatch, not the normal path.
3. **Never hand-write a root-absolute `href` in a page or component.** Astro rewrites
   bundled asset URLs and `<img src>` for a non-root `base`, but it does **not** rewrite
   string `href="/foo/"` attributes. Use `withBase()` from
   `src/data/navigation.ts` — it is the only URL helper left, because every route the
   old `sectionHref()`/`productHref()` helpers built was retired (ADR 0006).
   `tests/unit/deploy.test.ts` fails the build if an internal link escapes the base or
   does not resolve to a real file.
4. **The importer never runs in CI.** It needs the network, which would make builds
   non-deterministic. `WORDPRESS_BASE_URL` is therefore not a CI secret.
5. **Keep the unlisted-by-default policy** unless a change to `ALLOW_INDEXING=1` is
   deliberate. Every page carries `noindex`, `robots.txt` disallows everything, and no
   sitemap is emitted. ADR 0004 explains all six channels and why that set is minimal.
6. **Do not edit `sourceUrl`** in `src/content/products/*.json`. It is provenance for an
   import that already happened, not configuration.
7. **Update the ADRs when a decision changes.** ADR 0002 documents the no-CMS choice and
   points at the follow-up; ADR 0003 documents the hosting arrangement; ADR 0004 the
   indexing policy; ADR 0006 the two-section site and the homepage Instagram link.

## Environment gotchas that cost real time here

- **npm, not pnpm.** The pnpm store is unusable in this sandbox. `$HOME` is read-only
  (`EROFS`), and npm's default cache lives there, so installs need explicit paths:
  `npm ci --cache .cache/npm-cache --logs-dir .cache/logs`. `npx <tool>` can also fail
  for the same reason — prefer `npm run <script>`, which uses the local binary.
- **`astro check` hangs** in this environment; `npm run check` is `astro sync && tsc --noEmit`.
- **`/tmp` is not durable** across separate commands. Write scratch output inside the
  workspace (`.cache/` is gitignored).
- **Sandbox `curl` trap:** `curl -w` after a redirect chain reports the *final* status,
  which can make a 404 HTML page look like a 200. Check a single URL without `-L`.
- **`grep -c "<loc>"` counts lines, not matches.** Sitemaps are one line; use
  `grep -o "<loc>" | wc -l`.

## Local build variants

```bash
npm run build                                                    # apex: base '/', https://sweetcaroline.cl
SITE_URL=https://sredevopsorgagents.github.io/sweetcaroline npm run build   # project page: base '/sweetcaroline'
```

Both build the same four pages (`/`, `/nosotros/`, `/contacto/`, `404.html`) plus the
legacy redirect stubs. The second is the shape actually deployed, so test link and asset
integrity with it after touching any URL helper.

## Before you finish

```bash
npm run check
npm run build && npm test    # apex build: what both the unit tests and e2e expect
# plus the Docker e2e command above when UI, routing or accessibility changed
# then, if you touched any URL helper, re-verify the deployed shape:
SITE_URL=https://sredevopsorgagents.github.io/sweetcaroline npm run build && npm test
```

The two `npm test` runs cover different bases: the deploy-integrity suite reads the
base out of the build it is given, so the apex run proves nothing escapes `/` and the
project-page run proves nothing escapes `/sweetcaroline`. Finish on whichever variant
you mean to leave in `dist/`, and note that e2e only works on the apex one.

Report what you verified and what you did not.
