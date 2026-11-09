# ADR 0003 — Host on GitHub Pages, with redirect stubs for legacy URLs

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

The apex `sweetcaroline.cl` resolves to GitHub's Pages IPs
(`185.199.108-111.153`, NS Cloudflare) and serves a **static WordPress export**
(`server: GitHub.com`, `last-modified: 2024-05-13`). It is not a live
WordPress: `/wp-json/` and `/wp-login.php` return the GitHub Pages "Page not
found" shell, while `/wp-content/uploads/...` images are served. The live
editable site is `old.sweetcaroline.cl` (WordPress 6.4.3 + WooCommerce).

The repo `sredevopsorgagents/sweetcaroline` has Pages configured as a **project
page** at `https://sredevopsorgagents.github.io/sweetcaroline/`
(`build_type: workflow`, `cname: null`) — it does not claim the apex.

GitHub Pages serves static files only and cannot issue HTTP 301 redirects. The
WordPress site has 62 product permalinks at deeply nested paths such as
`/nuestros-productos/productos/confites/macarons-de-chocolate/`, plus
`/galeria/` and `/nuestros-productos/`.

## Decision

Deploy `dist/` to the repository's **project page** via `withastro/action@v6`
and `actions/deploy-pages@v5`, injecting
`SITE_URL=https://sredevopsorgagents.github.io/sweetcaroline`.

`astro.config.mjs` derives `base` from the path component of `SITE_URL` rather
than hardcoding it, so the asset URLs, canonicals, sitemap and `robots.txt` all
follow the deployment target and cannot drift from it. An explicit `BASE_PATH`
still overrides.

`public/CNAME` is **not** shipped: a project page must not publish a CNAME
claiming a domain it does not serve. It is re-added at apex cutover.

Preserve historical URLs by emitting a redirect stub at every legacy path:
a small HTML page carrying `<meta http-equiv="refresh">`, a `rel="canonical"`
pointing at the new URL, and `<meta name="robots" content="noindex, follow">`.

Each stub is written **twice** — as `<route>/index.html` and as
`<route>.html` — because static hosts disagree about trailing slashes. GitHub
Pages resolves `/foo` to `/foo/index.html` with a 301; some other servers simply
404. Each stub carries its own `noindex`, so the duplication has no SEO cost.

Redirect stubs are excluded from the sitemap, which would otherwise contradict
their `noindex` directive.

## Consequences

**Positive**

- No hosting cost, no server, no TLS to manage, no DNS change.
- Existing inbound links and search rankings survive the rebuild.
- Deploys are atomic and reversible: the previous artifact is one revert away.
- One config serves both the project page and the apex; only `SITE_URL` differs.

**Negative**

- No server-side redirects, hence the meta-refresh approach. Meta refresh is
  slower than a 301 and is technically a soft signal, but it is the standard
  workaround and is honoured by browsers and crawlers.
- GitHub Pages has soft bandwidth limits and no custom headers. Acceptable for a
  site of this size; if traffic or header needs grow, moving to Cloudflare Pages
  is a build-target change, not a rewrite.
- **Open item (apex cutover):** no repository currently claims
  `sweetcaroline.cl` in its Pages settings, yet the apex serves that 2024 export.
  The origin of that deployment must be identified before cutover, and
  `public/CNAME` restored. Until then the project page is the deployment target
  and production is untouched. Cutover is a deliberate, separate step.
- **Unlisted by default:** the served build is a client preview on a public URL,
  so it is de-indexed on every channel (per-page `noindex` meta and
  `X-Robots-Tag`, a blanket `Disallow: /` in `robots.txt` naming AI and archive
  crawlers, and no sitemap). This is recorded as its own decision in
  [ADR 0004](0004-unlisted-preview-by-default.md); `ALLOW_INDEXING=1` reverses it
  at cutover.

## Alternatives considered

- **Cloudflare Pages / Netlify** — better build ergonomics and real redirect
  rules, but requires a DNS change and a new account for no functional gain.
- **A container on an existing host** — full control and a path to SSR, but
  brings a server, TLS and patching to a static brochure.
