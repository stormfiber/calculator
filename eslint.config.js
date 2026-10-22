import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    ignores: ['build/**', 'coverage/**', 'node_modules/**', 'android/**', 'public/fa/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // The component does not use prop types
      'react/prop-types': 'off'
    }
  },
  {
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest
      }
    }
  },
  {
    files: ['*.js', 'tools/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node }
    }
  }
];
