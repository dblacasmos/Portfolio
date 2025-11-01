// eslint.config.js (ESM, flat config)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  // Ignorar carpetas grandes/generadas
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'build-reports/**'] },

  // Reglas base JS
  js.configs.recommended,

  // TypeScript sin type-check pesado
  ...tseslint.configs.recommended,

  // React Hooks + React Refresh
  reactHooks.configs.recommended,
  reactRefresh.configs.vite,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    },
  },


  // Accesibilidad básica en JSX
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-roles': 'warn',
      'jsx-a11y/no-autofocus': 'warn'
    }
  },
  // Tests unitarios / de componentes
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },

  // Override para e2e (Playwright)
  {
    files: ['e2e/**/*.{ts,tsx}'],
    plugins: { playwright },
    rules: {
      ...playwright.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off'
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
