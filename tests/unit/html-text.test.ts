/**
 * HTML → plain text normalisation, as used by the WordPress importer.
 *
 * These tests pin the *ordering* rules in `scripts/html-text.mjs`, which are
 * load-bearing for ADR 0002: the importer normalises markup, entities and
 * whitespace only, and must never rewrite or corrupt copy.
 *
 * Two of these cases are regression tests for CodeQL code-scanning alerts that
 * were open on `main`:
 *
 *  - `js/double-escaping` — decoding `&amp;` before the other entities turned
 *    `&amp;lt;script&amp;gt;` into live `<script>` markup.
 *  - `js/incomplete-multi-character-sanitization` — stripping tags in a single
 *    multi-character pass left `<script` behind for certain inputs.
 *
 * The preservation cases matter just as much as the security ones: they are what
 * proves the fix reorders the pipeline without changing imported content.
 */

import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText, stripShortcodes } from '../../scripts/html-text.mjs';

describe('decodeEntities', () => {
  it('decodes plain named entities', () => {
    expect(decodeEntities('AT&amp;T')).toBe('AT&T');
    expect(decodeEntities('a&nbsp;b')).toBe('a b');
    expect(decodeEntities('uno&hellip;dos')).toBe('uno…dos');
    expect(decodeEntities('&ndash;')).toBe('–');
    expect(decodeEntities('&rsquo;')).toBe('’');
  });

  it('decodes numeric and hexadecimal forms', () => {
    expect(decodeEntities('&#8211;')).toBe('–');
    expect(decodeEntities('&#x2013;')).toBe('–');
    expect(decodeEntities('&#39;')).toBe("'");
    expect(decodeEntities('&#039;')).toBe("'");
  });

  // Regression: CodeQL `js/double-escaping` (alert 3). `&amp;` is the escape
  // character itself, so decoding it first let a second pass see `&lt;` and
  // produce live markup from text that was only ever meant to *display* markup.
  describe('never unescapes twice (js/double-escaping)', () => {
    it('leaves double-escaped markup escaped', () => {
      expect(decodeEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;');
    });

    it('does not turn &amp;quot; into a bare double quote', () => {
      expect(decodeEntities('&amp;quot;')).toBe('&quot;');
    });

    it('does not turn &amp;amp; into a bare ampersand', () => {
      expect(decodeEntities('&amp;amp;')).toBe('&amp;');
    });

    it('decodes exactly one level, not two', () => {
      // `&amp;amp;lt;` is a double-escaped `&lt;`: one decode yields `&amp;lt;`
      // (still escaped), never a bare `<`.
      expect(decodeEntities('&amp;amp;lt;')).toBe('&amp;lt;');
      expect(decodeEntities('&amp;amp;lt;')).not.toContain('<');
    });
  });
});

describe('htmlToText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
    expect(htmlToText(undefined)).toBe('');
    expect(htmlToText(null)).toBe('');
  });

  it('preserves paragraphs and their text', () => {
    expect(htmlToText('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo');
    expect(htmlToText('<p>Uno</p>\n<p>Dos</p>')).toBe('Uno\n\nDos');
  });

  it('turns <br> into a line break and drops the tag', () => {
    expect(htmlToText('Uno<br>Dos')).toBe('Uno\nDos');
    expect(htmlToText('Uno<br/>Dos')).toBe('Uno\nDos');
  });

  it('drops script and style elements with their contents', () => {
    expect(htmlToText('<p>Antes</p><script>alert(1)</script><p>Después</p>')).toBe(
      'Antes\n\nDespués',
    );
    expect(htmlToText('<style>p{color:red}</style><p>Texto</p>')).toBe('Texto');
  });

  it('decodes entities once, preserving a literal ampersand', () => {
    expect(htmlToText('<p>AT&amp;T y M&amp;M</p>')).toBe('AT&T y M&M');
    expect(htmlToText('<p>a&nbsp;b</p>')).toBe('a b');
  });

  it('collapses whitespace but keeps paragraph structure', () => {
    expect(htmlToText('<p>  mucho    espacio  </p>')).toBe('mucho espacio');
    expect(htmlToText('<p>Uno</p><p></p><p></p><p>Dos</p>')).toBe('Uno\n\nDos');
  });

  // Regression: CodeQL `js/incomplete-multi-character-sanitization` (alerts 1, 2).
  // The old pipeline decoded entities FIRST, so `&lt;script&gt;` became live
  // markup *after* the strippers had already run and nothing removed it.
  //
  // The property being pinned is that source markup is stripped while it is
  // still markup, and that entities are decoded exactly once at the end. Note
  // what this does NOT claim: decoding `&lt;` yields a literal `<`, and those
  // characters are then indistinguishable from markup. That is inherent to
  // unescaping and cannot be ordered away. It is safe because the output is
  // plain text consumed by Astro expressions (`<p>{description}</p>`), which
  // escape it — never re-parsed as HTML by this tool.
  describe('cannot be defeated by nested or encoded tags', () => {
    it('removes a real script element with its contents', () => {
      expect(htmlToText('<script>alert(1)</script>')).toBe('');
      expect(htmlToText('<p>Antes</p><script>alert(1)</script><p>Después</p>')).toBe(
        'Antes\n\nDespués',
      );
    });

    it('removes a tag split by a nested angle bracket', () => {
      expect(htmlToText('<scr<script>ipt>alert(1)</script>')).toBe('scr');
    });

    it('does not interpret encoded markup as markup', () => {
      // `&lt;script&gt;` is text the origin escaped for display. It must survive
      // as text (`<script>` after exactly one decode), never be treated as a
      // live element and stripped as one.
      const out = htmlToText('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(out).toBe('<script>alert(1)</script>');
    });

    it('decodes double-escaped markup only one level, so it stays inert text', () => {
      const out = htmlToText('&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;');
      expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(out).not.toMatch(/<script[\s>]/i);
    });

    it('leaves no angle bracket from a real tag in the output', () => {
      for (const input of ['<p>a</p>', '<scr<script>ipt>', '<<script>script>alert(1)<</script>/script>']) {
        expect(htmlToText(input)).not.toMatch(/[<>]/);
      }
    });

    // The strippers run until the string stops changing. If someone reduces
    // either to a single pass again, these fail.
    it('resists a tag hidden behind a nested angle bracket in an attribute', () => {
      expect(htmlToText('<script<div>>alert(1)</script>')).not.toMatch(/<\/?[a-z]/i);
      expect(htmlToText('<script a=">">alert(1)</script>')).not.toMatch(/<\/?[a-z]/i);
    });

    it('drops element contents rather than leaking them as text', () => {
      // Deleting the element stripper would still remove the tags but leak the
      // contents — a content-corruption regression, not just a cosmetic one.
      expect(htmlToText('<p>A</p><script>var x=1;</script><p>B</p>')).toBe('A\n\nB');
      expect(htmlToText('<style>p{color:red}</style><p>Texto</p>')).toBe('Texto');
    });
  });

  // The fix reorders the pipeline. If it also changed the output for real
  // content, it would silently rewrite imported copy — which ADR 0002 forbids.
  describe('preserves real imported content verbatim', () => {
    it('reproduces a committed product description byte for byte', () => {
      const source =
        '<p>Una medida café espresso más una medida de agua caliente sin perder sus características aromáticas y de sabor.</p>\n';
      const committed =
        'Una medida café espresso más una medida de agua caliente sin perder sus características aromáticas y de sabor.';
      expect(htmlToText(source)).toBe(committed);
    });

    it('keeps accented characters and punctuation intact', () => {
      expect(htmlToText('<p>¿Quiénes somos?</p>')).toBe('¿Quiénes somos?');
      expect(htmlToText('<p>Región Metropolitana — Chile</p>')).toBe(
        'Región Metropolitana — Chile',
      );
    });
  });
});

describe('stripShortcodes', () => {
  it('removes WPBakery shortcode tags', () => {
    expect(stripShortcodes('[vc_row padding="2"]Hola[/vc_column]')).toBe(' Hola ');
  });

  it('leaves ordinary bracketed prose alone', () => {
    expect(stripShortcodes('Precio (IVA incluido) [1]')).toBe('Precio (IVA incluido) [1]');
  });
});
