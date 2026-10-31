import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Lens Studio-owned or third-party: Plugins/ (LEAF plugin install), Assets/Leaf.lspkg (unpacked
    // LEAF package), Workspaces/. tempAssetGen/ holds the CLAD build-sfx generator (CommonJS).
    ignores: [
      'node_modules/**',
      'coverage/**',
      'Support/**',
      'Cache/**',
      'Packages/**',
      'Plugins/**',
      'Workspaces/**',
      'Assets/Leaf.lspkg/**',
      'tempAssetGen/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['typings/**/*.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
);
