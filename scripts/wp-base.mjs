/**
 * Resolve the WordPress origin used to seed content.
 *
 * The origin is configuration, not source: it differs between the production
 * WordPress, a staging clone and a local dump, and a literal baked into the
 * importer means a mistyped run quietly reads (or writes) against production.
 * So there is deliberately **no default** — an unconfigured run fails loudly
 * before it touches the network.
 *
 * Kept in its own module, separate from `import-wordpress.mjs`, because that
 * script runs its entire main body at module scope: importing it from a test
 * would attempt real HTTP requests. This module has no side effects.
 */

export const WORDPRESS_BASE_URL_VAR = 'WORDPRESS_BASE_URL';

/** The guide a contributor is pointed at when the variable is missing. */
const SETUP_HINT = 'Copy .env.example to .env, or pass --wp-base <origin>.';

/**
 * Resolve the WordPress base URL.
 *
 * Precedence: explicit `flag` (the `--wp-base` CLI option) wins over `env`, so a
 * one-off run can target another origin without editing `.env`.
 *
 * @param {object} [options]
 * @param {string} [options.flag] Value of `--wp-base`, if given.
 * @param {NodeJS.ProcessEnv} [options.env] Environment to read; injectable for tests.
 * @returns {string} The base URL, without trailing-slash normalisation (the
 *   `URL` constructor used by the callers handles joins).
 * @throws {Error} When the value is missing, unparseable, or not http(s).
 */
export function resolveWpBase({ flag, env = process.env } = {}) {
  // `--wp-base ""`, `WORDPRESS_BASE_URL="  "` and a missing key all count as
  // unset: a blank value in a `.env` file must not be treated as a usable
  // origin, and a blank flag must not shadow a configured one (`||`, not `??`).
  const raw = flag || env[WORDPRESS_BASE_URL_VAR] || '';
  const value = raw.trim();

  if (!value) {
    throw new Error(
      `${WORDPRESS_BASE_URL_VAR} is not set. ${SETUP_HINT}`,
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${WORDPRESS_BASE_URL_VAR} is not a valid absolute URL: "${value}" ` +
        '(expected e.g. https://old.sweetcaroline.cl)',
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `${WORDPRESS_BASE_URL_VAR} must use http or https, got "${url.protocol}" in "${value}"`,
    );
  }

  return value;
}
