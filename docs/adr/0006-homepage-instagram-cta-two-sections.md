# ADR 0006 — Homepage links to Instagram; only Nosotros and Contacto remain

- **Status:** Accepted (revised 2026-11-09: the homepage no longer embeds posts)
- **Date:** 2026-11-08
- **Supersedes in part:** ADR 0002 (the product/category content is no longer
  published, though it is still imported and versioned)

## Context

The client asked to keep only the `Nosotros` and `Contacto` sections and to make
the landing page show the content of
[instagram.com/sweetcarolinechile](https://www.instagram.com/sweetcarolinechile/).
Every other section — `Productos`, `En cafetería`, `Galería de fotos` — had to go.

The first implementation embedded individual posts with Instagram's official
`embed.js`. The client then asked to **remove all of those embeds and keep only
the Instagram call to action**, leaving the rest of the site unchanged. That
reverses the first decision, so the reasoning that led to the embeds is kept
here: it is why no option was better than a plain link.

Instagram offers no official way to embed a whole profile:

| Option | Official? | Needs the target account? | Verdict |
| --- | --- | --- | --- |
| Plain link to the profile | n/a | no | **chosen** |
| Post/Reel embed (`embed.js` + `<blockquote class="instagram-media">`) | yes | no | used first, then removed at the client's request |
| Profile embed (`instagram.com/<user>/embed/`) | no | — | login-walled; not embeddable |
| Instagram API with Instagram Login (`/<ig-user-id>/media`) | yes | **yes** — a token authorizing *that* account | rejected: no valid token for `sweetcarolinechile` |
| Third-party widget (Elfsight `Account (Public)`, EmbedSocial) | no | no, but a vendor account | rejected: third-party dependency and account for a public feed |

A token for `@sweetcarolinechile` cannot be minted from another account: an
Instagram Login token is scoped to the account that authorized it, and there is no
`/username/media` endpoint. The earlier attempt failed with `OAuthException 190`
(session expired), and `@elclaustrocl`'s token cannot read `sweetcarolinechile`.

## Decision

1. **Routes.** The site publishes `/`, `/nosotros/`, `/contacto/` and `/404`.
   `src/pages/productos/`, `src/pages/[section]/`, `src/pages/en-cafeteria/`,
   `src/pages/producto/` and `src/pages/galeria-de-fotos.astro` are deleted, along
   with the components and `src/lib/catalog.ts` that only they used. `NAV_LINKS`
   holds `Nosotros` and `Contacto`; the logo links home.

2. **Homepage = a call to action, not a feed.** `/` is an introduction plus one
   prominent "Ver el perfil en Instagram" button pointing at
   `https://www.instagram.com/sweetcarolinechile/` (`target="_blank"`,
   `rel="noopener noreferrer"`), followed by the shared contact strip. The page
   loads **no Instagram script, no iframe and no post embed**: the only Instagram
   URL in the built HTML is the profile link, and nothing is requested from
   `instagram.com` until a visitor clicks it.

3. **Nothing is fetched at build time.** No token, no secret, no vendor account.
   Builds stay deterministic and offline-capable, which is the same reason the
   WordPress importer never runs in CI.

4. **Imported photographs are metadata only.** `src/data/instagram.json` keeps
   `profile` and `fallback` (the nine photographs imported from WordPress). No
   page renders them; the first one is the Open Graph image, which must be a local
   asset because `astro:assets` cannot optimise a remote file. The `posts` and
   `guestPosts` permalink lists were removed with the embeds — a list nothing
   reads would just drift.

5. **Retired URLs redirect to `/`.** Every historical WordPress permalink
   (62 products, `/nuestros-productos/`, `/galeria/`) now targets the homepage.
   `scripts/import-wordpress.mjs` derives the same map, so a re-import cannot
   resurrect the deleted `/producto/...` routes. The removed *new* routes
   (`/productos/`, `/en-cafeteria/`, `/galeria-de-fotos/`) are simply absent and
   fall through to `404` — they were only ever published on the preview.

6. **Content is retained, not published.** `src/content/products/*.json`,
   `categories/*.json`, `src/data/home.json` and the imported assets stay in the
   repository as provenance (ADR 0002). Nothing renders them, but deleting them
   would destroy the record of the import that already happened.

## Consequences

- **The landing page has no third-party surface.** No Instagram cookies, no
  cross-origin iframes and no `embed.js` on the critical path, so the page is
  equivalent for a visitor with a tracker blocker, on a slow connection, or while
  Instagram is down. This also sidesteps the cookie/consent question the embeds
  raised and the `frame-title` accessibility gap Instagram's own frames had.
- **The page is fast and cannot break from a vendor change.** Nothing on `/`
  depends on Instagram's markup, its script or its framing policy, which earlier
  served `x-frame-options: DENY` to anonymous visitors and produced blank 2px
  frames. That failure mode is now structurally impossible rather than mitigated.
- **The feed is one click away, not visible on the site.** A visitor who never
  clicks the button sees no posts at all. The client accepted that trade; if the
  requirement returns, the previous design is recoverable from this ADR and from
  git history (`4833933`).
- **`posts`/`guestPosts` are gone from the data file.** Re-introducing an embed
  means re-adding both the data and the component; `scripts/import-wordpress.mjs`
  no longer preserves a curated list because there is none to preserve.
- **Curation is unnecessary.** No permalink is maintained, so a deleted or
  renamed post cannot leave a dead embed on the landing page.
- **`/galeria/` is still a stub** that lands on the homepage.
- `tests/unit/deploy.test.ts` pins the published set: only `/`, `/nosotros/`,
  `/contacto/` and `404.html` may be real pages; everything else in `dist/` must
  be a redirect stub. `tests/e2e/journeys.spec.ts` asserts the homepage makes no
  request to `instagram.com`, and contains no iframe, blockquote or external
  script.
