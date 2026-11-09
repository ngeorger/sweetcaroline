# ADR 0002 — Content as committed JSON, seeded by a WordPress importer

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

The rebuild needs the 62 products, 8 categories and 7 pages from the existing
WordPress install. The options were to keep WordPress as a headless CMS, to run
a database-backed CMS (e.g. Supabase plus an admin UI), or to move the content
into the repository.

The content is small and changes slowly. There is one editor. The site has no
dynamic behaviour that needs to read content at request time.

## Decision

Content lives in the repository as typed JSON and Markdown, validated by Zod
schemas in `src/content.config.ts`. It is seeded once by
`scripts/import-wordpress.mjs`, which reads the WordPress REST API and is **run
manually, never in CI** — it needs the network, and making the build depend on a
live origin would make builds non-deterministic and fragile (the origin resets
connections under load).

That origin is supplied as `WORDPRESS_BASE_URL` (resolved by
`scripts/wp-base.mjs`, overridable per run with `--wp-base`). It deliberately has
no default: a misconfigured import must fail before it reaches the network rather
than quietly read production.

The importer normalises only markup, HTML entities and whitespace. It never
rewrites, corrects or invents copy. Gaps and typos are reported to the client in
`content-report.md`.

The exact ordering of that normalisation is load-bearing — markup is stripped
before entities are decoded, and `&amp;` is decoded last — because getting it
wrong silently corrupts copy. ADR 0005 records those rules and the CodeQL alerts
that prompted them; `scripts/html-text.mjs` implements them and
`tests/unit/html-text.test.ts` pins them.

## Consequences

**Positive**

- Builds are deterministic, offline and fast (now 4 pages plus the redirect
  stubs; it was 81 pages before ADR 0006 retired the catalog routes).
- Content changes are reviewable diffs with history and blame.
- No database, no CMS, no credentials, no backup strategy.
- The schemas are deliberately CMS-shaped, so a Git-based editor (Decap, Pages
  CMS, Sveltia) can be layered on later **without changing the content model**.

**Negative**

- The bakery cannot edit products herself; she must ask a developer.
  **This is the main accepted trade-off of the POC.**
- 23 of 62 products have no photograph in WordPress. That is a content gap, not
  a code problem, and it is listed in `content-report.md` for follow-up. The
  product pages that rendered a placeholder tile for them were retired by
  ADR 0006; the data and the report are kept as provenance.

## Alternatives considered

- **Supabase as a headless CMS + small admin UI** — gives the owner self-service
  editing, but adds a database, auth, RLS policies and an admin surface to a POC
  whose whole point is a modern frontend.
- **Headless WordPress** — no content migration at all, but it keeps the
  WordPress stack (and its plugin update treadmill) alive, and adds a fetch
  layer plus cache-invalidation work for content that changes twice a year.
