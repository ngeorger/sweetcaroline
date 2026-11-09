import rawSite from '../data/site.json';

export interface OpeningHours {
  label: string;
  schemaDays: string[];
  opens: string;
  closes: string;
  display: string;
}

export interface PostalAddress {
  street: string;
  commune: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  email: string;
  instagram: string;
  maps: string;
  mapsEmbed: string;
  address: PostalAddress;
  hours: OpeningHours[];
  copyright: string;
}

export const SITE: SiteConfig = rawSite as SiteConfig;
export const HOURS: OpeningHours[] = SITE.hours;
export const ADDRESS: PostalAddress = SITE.address;

/** `https://wa.me/<number>` with an optional pre-filled enquiry message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const telLink = `tel:${SITE.phoneHref}`;
export const mailtoLink = `mailto:${SITE.email}`;

/** Full postal address as a single display line. */
export function addressLine(): string {
  return `${ADDRESS.street}, ${ADDRESS.commune}, ${ADDRESS.city}`;
}
