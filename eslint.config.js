import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'coverage/**', 'Support/**', 'Cache/**', 'Packages/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['typings/**/*.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
);
