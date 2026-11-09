/**
 * Site navigation. Authored rather than imported: the order, wording and
 * grouping of the menu are design decisions, not content.
 *
 * The site publishes two sections besides the homepage (`/`), which carries the
 * Instagram feed. The catalog routes that used to live here were retired; see
 * `docs/adr/0006`.
 *
 * NOTE ON BASE PATHS: Astro rewrites `<img src>` and bundled asset URLs for a
 * non-root `base` automatically, but it does NOT rewrite plain string
 * `href="/foo/"` attributes. On a GitHub Pages project site every such link
 * points above the deployed root and 404s. Build every internal URL with
 * `withBase()` instead of writing a bare path.
 */
export interface NavLink {
  href: string;
  label: string;
}

/** Prefix an internal path with Astro's configured base. */
export function withBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/**
 * Navigation entries, in menu order. Paths are base-less; render through
 * `withBase`. The logo is the link home, so the homepage needs no entry.
 */
export const NAV_LINKS: NavLink[] = [
  { href: '/nosotros/', label: 'Nosotros' },
  { href: '/contacto/', label: 'Contacto' },
];

/** `NAV_LINKS` with the deployment base applied, ready to use in markup. */
export function navLinks(): NavLink[] {
  return NAV_LINKS.map((link) => ({ ...link, href: withBase(link.href) }));
}
