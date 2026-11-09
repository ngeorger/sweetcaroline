/**
 * Indexing policy — one flag that governs every "may this be indexed?" answer.
 *
 * The POC is deployed to a public GitHub Pages project page. Public is not the
 * same as *findable*: until the client signs off and the apex cutover happens,
 * the preview must not appear in search results, AI crawlers, social previews
 * or archives.
 *
 * `ALLOW_INDEXING=1` flips the whole policy at build time, so the cutover is an
 * environment change rather than a code change. Blocking is the default, so
 * forgetting to set it fails in the safe direction.
 */

/** True when the build may be indexed. Defaults to false (blocked). */
export const ALLOW_INDEXING = process.env.ALLOW_INDEXING === '1';

/**
 * `robots` meta value for the current build.
 *
 * `noindex` keeps the page out of search results. `nofollow` stops crawlers
 * following the (working, but not-for-publicity) catalog links; `noarchive`
 * and `nosnippet` suppress cached copies and search-result previews. Together
 * they also cover the widely-honoured `noai`-style intent without relying on a
 * directive that is not formally standardised.
 */
export const ROBOTS_CONTENT = ALLOW_INDEXING
  ? 'index, follow'
  : 'noindex, nofollow, noarchive, nosnippet, noimageindex';

/**
 * `X-Robots-Tag` value, emitted as a `<meta http-equiv>`.
 *
 * This is a header directive, but the same value is honoured as a meta tag by
 * major crawlers. GitHub Pages cannot set response headers, so the meta form is
 * the only available channel.
 */
export const X_ROBOTS_TAG = ROBOTS_CONTENT;

/** True when the build should advertise a sitemap to crawlers. */
export const SHOULD_ADVERTISE_SITEMAP = ALLOW_INDEXING;
