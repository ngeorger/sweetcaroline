import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // The content-integrity suite walks every product and asserts against the
    // files on disk, which is slower than a pure unit test.
    testTimeout: 30_000,
  },
});
