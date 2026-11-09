/**
 * HTML → normalised plain text, for the WordPress importer.
 *
 * Kept in its own module, separate from `import-wordpress.mjs`, because that
 * script runs its entire main body at module scope: importing it from a test
 * would resolve the origin, reach the network and call `process.exit`. This
 * module has no side effects, so the normalisation rules below can be pinned by
 * `tests/unit/html-text.test.ts` directly. Same reasoning as `wp-base.mjs`.
 *
 * The rules here are load-bearing for ADR 0002: the importer normalises markup,
 * entities and whitespace only. It never rewrites, corrects or invents copy, so
 * anything in this file must be exactly output-preserving for real content.
 */

/**
 * Decode the HTML entities the WordPress origin emits.
 *
 * `&amp;` is decoded **last** on purpose. It is both an escape character and
 * part of every other escape sequence, so decoding it first lets `&amp;lt;`
 * collapse to `<` — the text is then unescaped twice, and HTML-escaped markup
 * silently becomes live markup. That is CodeQL `js/double-escaping`.
 *
 * Each replacement below therefore runs on the original string only; no
 * replacement's output is ever re-scanned by a later one.
 *
 * @param {string} s Raw (still-escaped) text.
 * @returns {string} Text with entities decoded exactly once.
 */
export const decodeEntities = (s) =>
  s
    // Numeric forms first, so the named forms below need no `&#8217;`-style
    // aliases: every numeric entity is already resolved by these two passes.
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Last: never re-scanned, so it cannot expose a second escape sequence.
    .replace(/&amp;/g, '&');

/**
 * Turn an HTML fragment into normalised plain text, preserving paragraphs.
 *
 * Structure is removed **before** entities are decoded. Decoding first would
 * turn `&lt;script&gt;` into live markup *after* the strippers had already run,
 * leaving a tag in the output that nothing removes — CodeQL
 * `js/incomplete-multi-character-sanitization`. Stripping raw markup and
 * decoding once, at the end, closes that window by construction: no step that
 * runs after the tags are gone can introduce a `<`.
 *
 * @param {string | null | undefined} html Raw HTML fragment. Tolerates a nullish
 *   value, because a WordPress field can be present but empty.
 * @returns {string} Plain text with paragraphs separated by blank lines.
 */
export function htmlToText(html) {
  if (!html) return '';

  // 1. Drop script/style ELEMENTS whole, so their contents never reach the text.
  //    Repeated until the string stops changing: a single pass can be defeated
  //    by nested elements, and re-running the pattern is the documented fix for
  //    CodeQL `js/incomplete-multi-character-sanitization`. The loop is bounded
  //    in practice because each pass strictly shortens the string.
  let text = html;
  let previous;
  do {
    previous = text;
    text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  } while (text !== previous);
  // 2. Turn line/paragraph boundaries into newlines before tags disappear.
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6]|figure|figcaption)\s*>/gi, '\n\n');
  // 3. Remove the remaining tags, also repeated until stable. The class
  //    excludes `<`, so one pass already converges on every input — but
  //    re-running it is what makes that property evident to a static analyzer
  //    (CodeQL `js/incomplete-multi-character-sanitization`), and it costs
  //    one extra scan of an already-short string.
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);
  // 4. Belt and braces: no angle bracket from the source survives, so nothing
  //    above this line can be reconstructed by the decode below.
  text = text.replace(/<|>/g, '');

  // Entities are decoded exactly once, now that no markup remains — CodeQL
  // `js/double-escaping` and `js/incomplete-multi-character-sanitization`.
  text = decodeEntities(text);

  return text
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strip WPBakery / shortcode noise: `[vc_row ...]`, `[/vc_column]`.
 *
 * @param {string} s Raw text.
 * @returns {string} Text with shortcode tags replaced by a space.
 */
export const stripShortcodes = (s) => s.replace(/\[\/?[a-z_][^\]]*\]/gi, ' ');
