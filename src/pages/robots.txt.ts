/**
 * robots.txt as an endpoint rather than a static file.
 *
 * Two things are deployment-dependent and therefore cannot live in a static
 * file:
 *
 * 1. Whether the build may be indexed at all (see src/lib/indexing.ts).
 * 2. Where the sitemap lives. Deriving that from `Astro.site` + the configured
 *    base keeps it correct for both the project-page preview and the apex, and
 *    pointing crawlers at the wrong URL is worse than saying nothing.
 */
import type { APIRoute } from 'astro';
import { ALLOW_INDEXING, SHOULD_ADVERTISE_SITEMAP } from '../lib/indexing';

export const GET: APIRoute = ({ site }) => {
  // `new URL('sitemap-index.xml', site)` would resolve against the host root
  // and drop the base, so a project-page deploy would advertise the wrong
  // sitemap. Join the base path explicitly instead.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const origin = site ?? new URL('https://sweetcaroline.cl/');
  const sitemap = new URL(`${base}/sitemap-index.xml`, origin.origin);

  if (!ALLOW_INDEXING) {
    // No `Sitemap:` line: advertising one while asking not to be indexed is
    // contradictory, and a sitemap is itself an invitation to crawl.
    const body = `# Vista previa no publicada. No indexar.
#
# Este sitio es un POC en revisión. robots.txt es sólo una sugerencia: algunos
# robots lo ignoran, así que cada página envía además
# <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">.
# Para indexar este build, exportar ALLOW_INDEXING=1.

User-agent: *
Disallow: /

# Crawlers de IA y archivado, nombrados explícitamente por si ignoran el
# comodín anterior.
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
`;

    return new Response(body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const body = `User-agent: *
Allow: /

# El sitio no tiene rutas privadas ni de administración.
${SHOULD_ADVERTISE_SITEMAP ? `Sitemap: ${sitemap.href}\n` : ''}`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
