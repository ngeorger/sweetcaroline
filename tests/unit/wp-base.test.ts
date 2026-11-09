/**
 * The WordPress origin is configuration, not source.
 *
 * `scripts/wp-base.mjs` has no default on purpose: a run with no origin
 * configured must fail before it reaches the network, rather than quietly
 * reading (or writing) against production. These tests pin that behaviour,
 * including the precedence rule that lets a one-off `--wp-base` override
 * `.env`.
 */

import { describe, expect, it } from 'vitest';
import { WORDPRESS_BASE_URL_VAR, resolveWpBase } from '../../scripts/wp-base.mjs';

describe('resolveWpBase', () => {
  it('throws when no origin is configured, naming the variable and the fix', () => {
    expect(() => resolveWpBase({ env: {} })).toThrowError(WORDPRESS_BASE_URL_VAR);
    expect(() => resolveWpBase({ env: {} })).toThrowError(/\.env\.example/);
  });

  it.each([
    ['empty string', { [WORDPRESS_BASE_URL_VAR]: '' }],
    ['spaces', { [WORDPRESS_BASE_URL_VAR]: '   ' }],
    ['newline only', { [WORDPRESS_BASE_URL_VAR]: '\n' }],
  ])('treats a %s value as unset', (_label, env) => {
    expect(() => resolveWpBase({ env })).toThrowError(/is not set/);
  });

  it('returns a plain https origin', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: 'https://old.sweetcaroline.cl' };
    expect(resolveWpBase({ env })).toBe('https://old.sweetcaroline.cl');
  });

  it('trims surrounding whitespace', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: '  https://example.test\n' };
    expect(resolveWpBase({ env })).toBe('https://example.test');
  });

  it('preserves a path component', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: 'https://example.test/sub' };
    expect(resolveWpBase({ env })).toBe('https://example.test/sub');
  });

  it('prefers the --wp-base flag over the environment', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: 'https://from-env.test' };
    expect(resolveWpBase({ flag: 'https://from-flag.test', env })).toBe('https://from-flag.test');
  });

  it('lets a blank flag fall back to the environment rather than erroring', () => {
    // `--wp-base` with no value defaults to undefined, but a shell can also pass
    // an empty argument; neither should shadow a configured origin.
    const env = { [WORDPRESS_BASE_URL_VAR]: 'https://from-env.test' };
    expect(resolveWpBase({ flag: '', env })).toBe('https://from-env.test');
  });

  it('rejects a bare hostname with an actionable message', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: 'old.sweetcaroline.cl' };
    expect(() => resolveWpBase({ env })).toThrowError(/not a valid absolute URL/);
    expect(() => resolveWpBase({ env })).toThrowError(/old\.sweetcaroline\.cl/);
  });

  it('rejects a non-http(s) scheme', () => {
    const env = { [WORDPRESS_BASE_URL_VAR]: 'ftp://example.test' };
    expect(() => resolveWpBase({ env })).toThrowError(/must use http or https/);
  });
});
