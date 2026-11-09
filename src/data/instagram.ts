/**
 * Instagram profile configuration.
 *
 * The homepage links out to `@sweetcarolinechile` instead of embedding the
 * feed. Instagram has no official full-profile embed, and the per-post embed
 * script costs a third-party iframe per post and renders nothing at all when
 * Instagram refuses to be framed — so the landing page is a call to action and
 * nothing else. See `docs/adr/0006`.
 *
 * `fallback` is not rendered on any page: the homepage uses its first
 * photograph as the Open Graph image, which has to be a local asset because
 * `astro:assets` cannot optimise a remote file.
 */
import rawInstagram from './instagram.json';

export interface InstagramFallbackPhoto {
  /** Image key resolved by `src/lib/images.ts`, e.g. "gallery/foto-01". */
  key: string;
  alt: string;
}

export interface InstagramConfig {
  /** Our handle, without the `@`. */
  profile: string;
  /** Local photographs, used for metadata (and as a future fallback). */
  fallback: InstagramFallbackPhoto[];
}

/**
 * The configuration the site reads. `src/data/instagram.json` keeps the keys the
 * WordPress importer writes (`posts`, `guestPosts`); nothing embeds those
 * permalinks any more, so they are deliberately not part of this type.
 */
export const INSTAGRAM: InstagramConfig = rawInstagram as InstagramConfig;

/** The public profile URL the homepage links to. */
export const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM.profile}/`;
