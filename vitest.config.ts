import { defineConfig } from 'vitest/config';

// Only pure logic is tested in Node. Files that extend BaseScriptComponent are excluded
// from the test import graph on purpose (they need the Lens Studio runtime).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
});
