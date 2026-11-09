# ADR 0005 — Importer text normalisation: strip markup first, decode entities last

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

`scripts/import-wordpress.mjs` turns the WordPress REST API's HTML into the
plain text committed under `src/content/`. That text is the site's copy, so the
pipeline is governed by the rule in ADR 0002: it normalises markup, entities and
whitespace **only**, and never rewrites or corrupts what the client wrote.

CodeQL code scanning flagged three alerts against `main`, all in that pipeline
(all three rated *high*, all in the `javascript-typescript` analysis):

| Rule | Cause |
| --- | --- |
| `js/double-escaping` | `&amp;` was replaced **before** `&lt;`, `&gt;`, `&quot;` and `&apos;` |
| `js/incomplete-multi-character-sanitization` | `replace(/<(script\|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')` ran once, so a second pass could reconstruct a tag |
| `js/incomplete-multi-character-sanitization` | `replace(/<[^>]+>/g, '')` could leave `<` behind for nested brackets |

The two defects were structural, not cosmetic:

- **Double-unescaping.** Because `&amp;` is both an escape character and part of
  every other escape sequence, decoding it first meant `&amp;lt;script&amp;gt;`
  produced a bare `<script>`. HTML-escaped markup silently became live markup,
  one decode level deeper than intended.
- **Decode before strip.** Entities were decoded *first*, then tags were
  stripped. So `&lt;script&gt;` was decoded into a real `<script>` tag **after**
  the stripper had already run, and nothing removed it. The sanitizer ran on the
  wrong representation.

The alerts are not currently exploitable: the origin is a first-party site, the
output is committed and reviewed, and every committed description contains no
`<` or `&` at all (verified across all 62 products). But the first defect can
silently **corrupt copy** — which is a direct violation of ADR 0002's central
promise — so both were fixed rather than dismissed.

## Decision

Reorder the pipeline in a new side-effect-free module, `scripts/html-text.mjs`:

1. **Remove structure first, while the input is still raw markup** — drop
   `script`/`style` elements whole, convert `<br>` and block-closing tags to
   newlines, remove the remaining tags with a single-character class
   (`/<[^>]*>/g`, which excludes `<` and so cannot be defeated by nesting), then
   a final `/<|>/g` pass.
2. **Decode entities exactly once, at the very end** — with `&amp;` **last**, so
   no replacement's output is ever re-scanned by a later one.

Both multi-character removals are **repeated until the string stops changing**,
which is the fix CodeQL documents for `js/incomplete-multi-character-sanitization`.
For the tag-removal pass this is belt and braces rather than a behavioural fix —
the class excludes `<`, so one pass already converges on every input, and
repeating it was verified output-identical. For the element-removal pass it is
load-bearing: a single pass over `<(script|style)\b[^>]*>…` can be defeated by a
nested angle bracket in the attribute region.

Pinning the order makes the sanitization sound *by construction*: no step that
runs after the tags are gone can introduce a `<`.

Note that the element removal is retained rather than deleted, even though it is
the pattern the analyzer objects to. Deleting it would still leave no tag in the
output, but it would leak element *contents* into the copy — `<style>p{color:red}</style><p>Texto</p>`
would yield `p{color:red}Texto` instead of `Texto`. That is a content-corruption
regression, so the pattern stays and is made defeat-proof instead.

`decodeEntities`, `htmlToText` and `stripShortcodes` moved into that module
because `import-wordpress.mjs` executes its whole body at module scope —
importing it from a test resolves the origin, reaches the network and calls
`process.exit`. The module has no side effects, so `tests/unit/html-text.test.ts`
pins all of the above directly. This mirrors the existing `scripts/wp-base.mjs`
split, and is the only reason the behaviour is testable at all.

## Consequences

**Positive**

- The three alerts are fixed at the root, not dismissed. Detecting them required
  no new dependency.
- Output is provably unchanged for real content: the new pipeline was diffed
  against the old one over all 143 HTML fields (title, excerpt, content) of all
  62 products from the live origin — **zero differing fields** — and
  `npm run content:check` round-trips to *"check passed"*.
- The security property is now pinned by tests that genuinely fail on the old
  code: replaying the new suite against the pre-fix helpers fails exactly the 6
  security assertions and passes all 15 preservation assertions.
- Sanitization is order-correct rather than patched: there is no input for which
  a later stage can rebuild a tag.

**Negative**

- **Decoding is inherently a de-escaping operation, so it cannot be made fully
  "safe" by ordering.** After a single, correct decode, a literal `<` in the
  output is indistinguishable from markup. That is inherent to unescaping, not a
  defect in this pipeline. It is safe here only because the output is *plain
  text* consumed by Astro expressions (`<p>{description}</p>`, `content={...}`),
  which escape it, and is never re-parsed as HTML.
- **This is not a general-purpose sanitizer, and must not be reused as one.**
  It is fit for purpose precisely because its input is a trusted first-party
  origin and its output is plain text. Feeding it attacker-controlled HTML and
  emitting the result as HTML would not be safe.
- A known, **pre-existing and still-open** concern sits just downstream:
  `BaseLayout.astro` emits JSON-LD via `set:html={JSON.stringify(graphs)}`, and
  `JSON.stringify` does not escape `</script>`. A description containing that
  sequence would break out of the script block. It is unreachable today (no
  committed content contains `<` or `&`), no alert covers it, and it is out of
  scope here — but it should be fixed by escaping `<` as `\u003c` in the
  JSON-LD, tracked separately.

## Alternatives considered

- **Dismiss the alerts as non-exploitable.** Defensible on impact — the origin is
  trusted and the output is committed — but wrong on substance: the double-unescape
  can silently corrupt the client's copy, which ADR 0002 exists to prevent.
- **Add `sanitize-html`.** The CodeQL-recommended fix, and the right call for
  untrusted input. Rejected here as YAGNI: this is a build-time importer over a
  first-party origin, and a full HTML sanitizer would alter output (it rewrites
  markup and entities aggressively), breaking the verbatim-copy guarantee.
- **Loop the replacements until the string stops changing.** Satisfies the
  analyzer, but treats the symptom: it leaves the decode-before-strip ordering
  bug — the actual root cause — in place, and adds unnecessary machinery.
