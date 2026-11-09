# ADR 0004 — Serve the preview unlisted by default

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

The POC is deployed to a public GitHub Pages project page and includes the
client's real brand, catalog, photography and contact details. Being reachable
is required for review; being *findable* is not desired before sign-off.

Public and findable are different properties. A public URL is indexed by search
engines, quoted in search snippets, cached by archives, and ingested by
AI-training and answer-engine crawlers — all of which persist after the URL is
changed or removed, and none of which the client has agreed to for an unreviewed
draft. The existing build actively invited crawling: `Allow: /` plus a sitemap
listing 80 URLs.

## Decision

De-index the build on every available channel, defaulting to blocked:

1. **Per-page meta** — `<meta name="robots" content="noindex, nofollow,
   noarchive, nosnippet, noimageindex">` on every page, including `404.html` and
   the legacy redirect stubs.
2. **Header directive in meta form** — the same value as
   `<meta http-equiv="X-Robots-Tag">`, because GitHub Pages cannot set real
   response headers and some crawlers key on that directive rather than on
   `robots`.
3. **`robots.txt`** — `Disallow: /` for `User-agent: *`, plus explicit blocks for
   the named AI and archive crawlers (GPTBot, OAI-SearchBot, ChatGPT-User,
   ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Applebot-Extended,
   CCBot, Bytespider, Amazonbot, FacebookBot, meta-externalagent).
4. **No sitemap** — the sitemap is emitted empty and `robots.txt` carries no
   `Sitemap:` line, since a sitemap is itself an invitation to crawl.
5. **Redirect stubs** use `noindex, nofollow` rather than the previous
   `noindex, follow`, so a stub does not pass crawlers onward.
6. **One flag** — `ALLOW_INDEXING=1` at build time flips all of the above, so the
   cutover is an environment change rather than a code edit.

## Consequences

**Positive**

- The draft cannot leak into search results, snippets, caches or AI corpora
  before the client has approved it.
- Blocking is the default, so forgetting to set a variable fails safe.
- The cutover is one environment variable, not a code change; the same build
  serves both modes, verified by tests on both branches.

**Negative**

- **`robots.txt` is only advisory.** A crawler may ignore it. The per-page
  `noindex` directive is the load-bearing part; the rest is defence in depth.
  This is mitigating, not guaranteeing — the only certain protection is
  authentication, which GitHub Pages does not offer for project pages.
- De-indexing after the fact is slow and partial for engines that have already
  fetched the site, which is exactly why blocking precedes publication here
  rather than following it.
- `ALLOW_INDEXING=1` must be set deliberately at cutover, and the sitemap
  regenerates only then.

## Alternatives considered

- **`robots.txt` only** — the conventional single-measure approach, but it
  protects nothing against crawlers that ignore it, and leaves `noindex` unset
  for engines that already hold the URL.
- **Password / access control** — the only airtight option, but GitHub Pages
  project sites cannot be access-controlled without moving to a paid offering or
  another host, which the hosting decision (ADR 0003) already settled.
- **A `noindex` `<meta>` only** — sufficient for large engines, but it leaves
  `robots.txt` advertising a sitemap, which contradicts the intent and keeps the
  crawl door open for aggregators.
