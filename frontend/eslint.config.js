import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const moduleNames = ['crm', 'property', 'leasing', 'accounting', 'payments', 'iot', 'helpdesk', 'erpnext']

const forbid = (...groups) => ({
  'no-restricted-imports': [
    'error',
    { patterns: groups.map(([group, message]) => ({ group, message })) },
  ],
})

const moduleBoundaries = moduleNames.map((name) => ({
  files: [`src/modules/${name}/**/*.{ts,tsx}`],
  rules: forbid(
    [
      moduleNames.filter((other) => other !== name).map((other) => `@/modules/${other}/**`),
      'Modules must not import from other modules. Move shared code to src/shared or src/core.',
    ],
    [['@/app/**'], 'Modules must not import from the app layer.'],
  ),
}))

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: forbid([
      ['@/app/**', '@/modules/**', '@/shared/**', '@/design-system/**'],
      'core is infrastructure and must not depend on UI layers, shared components or modules.',
    ]),
  },
  {
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: forbid([
      ['@/app/**', '@/modules/**', '@/shared/**'],
      'design-system primitives must not depend on shared components, modules or the app layer.',
    ]),
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: forbid([['@/app/**', '@/modules/**'], 'shared components must not depend on modules or the app layer.']),
  },
  ...moduleBoundaries,
)
