// eslint.config.js (ESM, flat config)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

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

    plugins: { import: importPlugin },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      // Orden de imports y sin default export (salvo raíces)
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'import/no-default-export': 'warn',
    },
  },

  // Permitir default export en puntos raíz de la app
  {
    files: ['src/main.tsx', 'src/App.tsx', 'src/game/Game.tsx'],
    rules: { 'import/no-default-export': 'off' },
  },

  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
])
