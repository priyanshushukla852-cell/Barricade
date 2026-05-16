const expo = require('eslint-config-expo/flat');
const tseslint = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/**', 'server/**', '.expo/**', 'dist/**'] },

  // Expo base: React Native globals, import resolution, TypeScript parser/plugin for .ts/.tsx
  ...expo,

  // Extend with @typescript-eslint/recommended + Prettier for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  },
];
