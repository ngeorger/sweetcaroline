import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility gate.
 *
 * `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` are the levels the
 * site claims. Best-practice rules are included too, because several of them
 * (landmark structure, heading order) are the ones a redesign is most likely
 * to regress.
 */
const ROUTES = [
  '/',
  '/nosotros/',
  '/contacto/',
];

for (const route of ROUTES) {
  test(`${route} has no axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    }));

    expect(summary).toEqual([]);
  });
}

test('every image exposes an accessible name', async ({ page }) => {
  for (const route of ['/', '/nosotros/', '/contacto/']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    const missing = await page.$$eval('img', (images) =>
      images
        .filter((image) => !image.getAttribute('alt')?.trim() && image.getAttribute('aria-hidden') !== 'true')
        .map((image) => image.getAttribute('src') ?? '(no src)'),
    );
    expect(missing, `images without alt on ${route}`).toEqual([]);
  }
});

test('the page exposes one h1 and a main landmark', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main#contenido')).toHaveCount(1);
  }
});
