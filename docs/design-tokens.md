# Design tokens

Extracted from the compiled WordPress CSS at `old.sweetcaroline.cl` (theme
`cakecious`, dynamic customiser styles). Source values are quoted so a future
change to the brand can be traced back.

## Colour

| Token | Value | Source / role | Contrast on white |
| --- | --- | --- | --- |
| `--color-brand-50` | `#fff0f7` | **New.** Surface tint for section headers and placeholders | — |
| `--color-brand-500` | `#e6007e` | `.cakecious-header-main-bar-inner`, `body` | **4.50:1** — passes AA, no headroom |
| `--color-brand-700` | `#b20065` | `.shopping-cart-count`, hover/focus accents | **6.82:1** |
| `--color-brand-900` | `#7a0043` | **New.** Display headings on light backgrounds | **11.00:1** |
| `--color-accent-500` | `#1f7691` | `.has-cakecious-color-4` (hero subtitle) | **5.17:1** |
| `--color-brand-line-soft` | `#f2b8ca` | Footer secondary text in the old theme | **1.68:1 on white** |
| `--color-brand-line-strong` | `#f195b2` | Theme accent (`#f195b2`, ×118) | **2.17:1 on white** |
| `--color-ink-900` | `#242424` | Body text (from `#242424`) | **15.2:1** |
| `--color-ink-700` | `#3f3f3f` | Secondary text | **10.4:1** |
| `--color-ink-600` | `#5c5c5c` | Muted text | **6.69:1** |

### The `-line-` naming is deliberate

The original site rendered its footer in `#f2b8ca` on `#e6007e` — **2.68:1**,
a clear WCAG AA failure. The rebuild keeps both colours for borders and surfaces
where contrast does not apply, but names them `brand-line-*` rather than
`brand-100`/`brand-300` so that using one as a text colour reads as obviously
wrong. `text-brand-100` compiles to nothing.

Note also that `text-white/90` on `brand-500` composites to roughly 3.6:1 and
would fail too. Footer body text is full white (4.51:1); hierarchy comes from
weight and size instead.

## Typography

Poppins, self-hosted at build time by the Astro Fonts API
(`astro.config.mjs`), weights 400/600/700/800, `latin` subset — the same
typeface the WordPress theme requested from Google Fonts at runtime.

Base size is **16px with 1.6 line-height**. The old theme rendered body copy at
12px.

## The scalloped header edge

A brand signature carried over from the original design. Implemented as a 48×24
SVG tile:

```css
background-image: url("data:image/svg+xml,…");
background-repeat: repeat-x;
background-size: 48px 24px;   /* fixed — never scaled with the element */
```

A fixed tile keeps the scallops **circular at any viewport width**. Alternatives
that look equivalent but are not:

- a stretched inline `<path>` scales non-uniformly, so the scallops become
  ellipses on wide screens;
- a `radial-gradient` takes its radii from the element's box, so the scallop
  shape changes with the container.

## Rules for new pages

1. **Text colour must come from `brand-500`, `brand-700`, `brand-900`,
   `accent-500`, `ink-600`, `ink-700` or `ink-900`** on a light background — or
   full `white` on `brand-500`/`brand-700`/`brand-900`.
2. **Never put text on `brand-line-*`.**
3. **Never put white text on an image** without a solid backing panel. Hero
   copy sits on a `brand-50` panel for exactly this reason; contrast over a
   photograph depends on unpredictable pixels.
4. Every interactive element gets a visible `:focus-visible` ring (inherited
   from `global.css`).
5. `npm run test:e2e` runs axe over every route; a regression fails CI.
