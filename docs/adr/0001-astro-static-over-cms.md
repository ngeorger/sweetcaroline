# ADR 0001 — Astro static output over a site framework or CMS

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

`sweetcaroline.cl` served a WordPress 6.4.3 site (WooCommerce 8.7.0, WPBakery
Page Builder, Slider Revolution, `cakecious` theme). The apex domain currently
resolves to a stale 2024 static mirror, while the live WordPress runs on
`old.sweetcaroline.cl`.

The site has:

- 7 pages, 8 product categories, 62 products, ~165 media files;
- **no e-commerce**: no price markup, no cart, no checkout anywhere in the
  rendered HTML. Orders happen over WhatsApp and phone;
- no user accounts, no dynamic personalisation, no logged-in area.

The catalogue and copy change a few times a year, not continuously.

## Decision

Build the new site with **Astro 7 in static output mode**, with TypeScript and
Tailwind CSS 4.

## Consequences

**Positive**

- Every route is pre-rendered HTML. There is no server to run, patch, scale or
  pay for, and no runtime that can be down.
- The content is the same regardless of who requests it, so a CDN serves the
  whole site and time-to-first-byte is bounded by the edge, not by PHP.
- Client JavaScript is limited to three small interactions (mobile menu,
  gallery `<dialog>`, nothing else). No hydration cost.
- `astro:assets` and the built-in Fonts API handle image and font optimisation
  at build time, which is where the old site was slowest.

**Negative**

- Content edits require a commit and a rebuild rather than a browser login.
  Accepted for the POC; see ADR 0002.
- No server-side form handling. Orders already happen off-site over WhatsApp,
  so nothing is lost.

## Alternatives considered

- **Next.js (App Router)** — a server runtime and RSC machinery for a site with
  no dynamic data. More to deploy, more to keep current, no user-visible gain.
- **Vite + React SPA** — client-rendered HTML would hurt the local SEO the
  bakery depends on and delay first paint on mobile.
- **Keep WordPress, replace the theme** — cheapest in content churn, but keeps
  the plugin stack (WPBakery + Slider Revolution) that produced the current
  performance and accessibility problems.
