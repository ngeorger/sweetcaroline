import { expect, test } from '@playwright/test';

const MAIN_ROUTES = [
  { path: '/', heading: /instagram/i },
  { path: '/nosotros/', heading: /la pastelería/i },
  { path: '/contacto/', heading: /^contacto$/i },
];

/** Routes deleted with the catalog redesign; nothing may serve them. */
const RETIRED_ROUTES = ['/productos/', '/en-cafeteria/', '/galeria-de-fotos/'];

test.describe('critical journeys', () => {
  test('home page is a call to action for the Instagram profile', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/sweet caroline en instagram/i);

    // The profile link is the whole point of the page: it must open Instagram
    // itself, in a new tab, without leaking the referrer.
    const profile = page.getByRole('link', { name: /ver el perfil en instagram/i }).first();
    await expect(profile).toHaveAttribute('href', 'https://www.instagram.com/sweetcarolinechile/');
    await expect(profile).toHaveAttribute('target', '_blank');
    await expect(profile).toHaveAttribute('rel', /noopener/);
  });

  test('home page embeds nothing from Instagram', async ({ page }) => {
    // The landing page links out instead of embedding: no iframe, no blockquote
    // and no third-party script. A visitor with a blocker, or Instagram down,
    // sees exactly the same page as everyone else.
    const offSite: string[] = [];
    page.on('request', (request) => {
      if (/instagram\.com/.test(new URL(request.url()).hostname)) offSite.push(request.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    // Let any late script finish before counting.
    await page.waitForTimeout(1500);

    await expect(page.locator('main iframe')).toHaveCount(0);
    await expect(page.locator('main blockquote')).toHaveCount(0);
    await expect(page.locator('script[src]')).toHaveCount(0);

    // Only the CTA may reach Instagram, and only when it is clicked.
    expect(offSite, offSite.join('\n')).toEqual([]);
  });

  test('the homepage does not overflow on a narrow screen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });

  test('shows both published opening-hours ranges on the contact page', async ({ page }) => {
    await page.goto('/contacto/');

    await expect(page.getByText(/viernes a domingo, 16\.30 a 21\.30/i).first()).toBeVisible();
    await expect(page.getByText(/lunes a domingo, 10\.00 a 20\.00/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /ver en google maps/i }).first()).toHaveAttribute(
      'href',
      'https://maps.sweetcaroline.cl',
    );
  });

  test('does not serve the retired sections', async ({ request }) => {
    for (const route of RETIRED_ROUTES) {
      const response = await request.get(route);
      expect(response.status(), `${route} should be gone`).toBe(404);
    }
  });

  test('a legacy stub declares its canonical target', async ({ request }) => {
    const response = await request.get('/nuestros-productos/productos/confites/macarons-de-chocolate/');
    expect(response.status()).toBe(200);

    const body = await response.text();
    // Retired product pages redirect to the homepage, which is where the
    // Instagram feed and the contact details live.
    const target = 'https://sweetcaroline.cl/';

    expect(body).toContain('http-equiv="refresh"');
    expect(body).toContain(`url=${target}`);
    expect(body).toContain(`rel="canonical" href="${target}"`);
    // Stubs must not compete with the real page in search results. While the
    // preview is unlisted the stub is blocked outright (`noindex, nofollow`);
    // an indexing-enabled build relaxes only the follow half.
    expect(body).toMatch(/<meta name="robots" content="noindex[^"]*">/);
  });

  test('the redirect target actually exists', async ({ request }) => {
    // The stub redirects to the absolute production URL, so a local preview
    // server must not follow it. Assert the redirect contract on the markup and
    // resolve the target separately instead.
    const stub = await request.get('/galeria/');
    expect(stub.status()).toBe(200);

    const body = await stub.text();
    expect(body).toContain('url=https://sweetcaroline.cl/');

    // The in-page link is base-aware, so it works where the meta refresh to the
    // absolute URL might not.
    const href = /<a href="([^"]+)">Ir a la nueva dirección/.exec(body)?.[1] ?? '';
    expect(href).toMatch(/^\/(sweetcaroline\/)?$/);

    // The target itself is a real page, not the 404 shell.
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<h1');
  });

  test('every published page carries a noindex directive', async ({ page, request }) => {
    // The preview is public but must stay unlisted. robots.txt is advisory, so
    // the per-page directive is the load-bearing one; assert it end-to-end.
    for (const route of MAIN_ROUTES.map((r) => r.path)) {
      await page.goto(route);
      const content = await page
        .locator('meta[name="robots"]')
        .getAttribute('content');
      expect(content, `${route} should be noindex`).toContain('noindex');
    }

    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toMatch(/User-agent: \*\s*\nDisallow: \//);
  });

  test('renders a 404 page for an unknown path', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/no encontrada/i);
  });
});

test.describe('navigation', () => {
  for (const route of MAIN_ROUTES) {
    test(`${route.path} renders its heading`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(route.heading);
    });
  }

  test('mobile menu opens, closes on Escape and returns focus', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only behaviour');

    await page.goto('/');
    const toggle = page.getByRole('button', { name: /menú/i });

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: /móvil/i })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  /**
   * Regression guard for the first GitHub Pages deploy, which shipped every
   * asset and internal link as a root-absolute path while the site was served
   * from `/sweetcaroline/`, so all of them 404'd. This follows the links a
   * visitor actually clicks and asserts they land on real pages.
   */
  test('every header nav link resolves to a real page', async ({ page, isMobile }) => {
    await page.goto('/');

    // The header renders two navs and hides one per breakpoint; open the mobile
    // menu so its links are reachable on a phone viewport.
    const name = isMobile ? /navegación principal móvil/i : /navegación principal$/i;
    if (isMobile) {
      await page.getByRole('button', { name: /menú/i }).click();
    }
    const nav = page.getByRole('navigation', { name });

    const hrefs = await nav.getByRole('link').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    );
    // Nosotros and Contacto; the logo is the link home.
    expect(hrefs.length).toBeGreaterThan(1);

    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), `nav link ${href} should resolve`).toBe(200);

      const body = await response.text();
      // A styled page links its stylesheet; an unstyled 404 shell does not.
      expect(body, `nav link ${href} should be a real page`).toContain('<h1');
    }
  });

  test('the navigation offers only the two remaining sections', async ({ page, isMobile }) => {
    await page.goto('/');

    const name = isMobile ? /navegación principal móvil/i : /navegación principal$/i;
    if (isMobile) {
      await page.getByRole('button', { name: /menú/i }).click();
    }
    const nav = page.getByRole('navigation', { name });

    const labels = await nav.getByRole('link').allInnerTexts();
    expect(labels.map((label) => label.trim().toUpperCase())).toEqual(['NOSOTROS', 'CONTACTO']);
  });
});

test.describe('layout integrity', () => {
  for (const route of MAIN_ROUTES) {
    test(`${route.path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(route.path);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      // Allow a single pixel for sub-pixel rounding.
      expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
    });
  }
});
