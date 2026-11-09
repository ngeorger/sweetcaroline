import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content is authored by `scripts/import-wordpress.mjs` from the WordPress REST
 * API and committed to the repository. Nothing here is fetched at build time,
 * so builds stay deterministic and offline-capable.
 */

const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.object({
    name: z.string().min(1),
    /** Display sections this product appears in. */
    sections: z.array(z.enum(['productos', 'cafeteria'])).default([]),
    /** Display category slugs. Must resolve in the `categories` collection. */
    categories: z.array(z.string()).default([]),
    description: z.string().default(''),
    /** Image key resolved by `src/lib/images.ts`, e.g. "products/macarons". */
    image: z.string().nullable().default(null),
    /** Tortas subgroups collapsed from the WordPress taxonomy. */
    subgroup: z.enum(['personalizadas', 'estandar', 'diabeticos']).nullable().default(null),
    /** Original WordPress permalink, used to emit legacy redirect stubs. */
    sourceUrl: z.string().url(),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/categories' }),
  schema: z.object({
    name: z.string().min(1),
    order: z.number().int().nonnegative(),
    image: z.string().nullable().default(null),
    /**
     * Hidden categories are excluded from section tiles. `postres` is empty in
     * the WordPress source and is hidden rather than rendered as an empty grid.
     */
    hidden: z.boolean().default(false),
    /** Set when a category has no products; surfaced in the content report. */
    empty: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(''),
    images: z
      .array(z.object({ key: z.string(), alt: z.string() }))
      .default([]),
  }),
});

export const collections = { products, categories, pages };
