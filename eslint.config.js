// eslint.config.ts (ESM, flat config)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  // Ignorar carpetas globales
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },

  // Reglas base JS
  js.configs.recommended,

  // TypeScript recomendado (sin type-check pesado)
  ...tseslint.configs.recommended,

  // React Hooks + React Refresh
  reactHooks.configs.recommended,
  reactRefresh.configs.vite,

  // Ajustes del proyecto y reglas extra
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      // Evita romper Fast Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Hooks útiles
      'react-hooks/exhaustive-deps': 'warn',
      // TS/estilo
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    },
  },
  // Override para tests: permitimos 'any' en mocks
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
