import { SITE, ADDRESS, HOURS } from './site';
import { withBase } from '../data/navigation';

export interface Breadcrumb {
  name: string;
  path: string;
}

/** Resolve a site-relative path to an absolute URL against `site`. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  const base = site ?? new URL('https://sweetcaroline.cl');
  return new URL(path, base).toString();
}

/**
 * `Bakery` is a schema.org subtype of `LocalBusiness` / `FoodEstablishment`,
 * which is what local search results key on. Phone is E.164 because Google
 * requires it for `telephone`.
 */
export function buildLocalBusiness(site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    '@id': `${absoluteUrl('/', site)}#bakery`,
    name: SITE.name,
    description: SITE.description,
    url: absoluteUrl('/', site),
    telephone: SITE.phoneHref,
    email: SITE.email,
    image: absoluteUrl('/og-image.png', site),
    priceRange: '$$',
    currenciesAccepted: 'CLP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.commune,
      addressRegion: ADDRESS.region,
      addressCountry: ADDRESS.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: ADDRESS.latitude,
      longitude: ADDRESS.longitude,
    },
    hasMap: SITE.maps,
    sameAs: [SITE.instagram],
    openingHoursSpecification: HOURS.map((entry) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: entry.schemaDays,
      opens: entry.opens,
      closes: entry.closes,
    })),
  };
}

export function buildBreadcrumbs(trail: Breadcrumb[], site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      // Trail paths are authored base-less; `absoluteUrl` resolves against
      // `site`, which for a project page already carries the `/repo` prefix.
      item: absoluteUrl(withBase(item.path), site),
    })),
  };
}
