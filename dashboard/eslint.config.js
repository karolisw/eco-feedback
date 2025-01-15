import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist'] // Ignore dist folder
  },
  {
    files: ['**/*.{ts,tsx}'], // Apply to TypeScript and TSX files
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript version
      sourceType: 'module', // Use ES module syntax
      parser: tsParser, // Use TypeScript parser
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'], // Specify TS config files
        tsconfigRootDir: import.meta.dirname // Base directory for TS config
      },
      globals: globals.browser // Browser global variables
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint,
      'react-refresh': reactRefresh
    },
    rules: {
      ...js.configs.recommended.rules, // Use recommended JavaScript rules
      ...tseslint.configs['recommended-type-checked'].rules, // Type-checked TypeScript rules
      ...react.configs.recommended.rules, // React recommended rules
      ...react.configs['jsx-runtime'].rules, // JSX runtime rules for React 17+
      ...reactHooks.configs.recommended.rules, // React hooks rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ]
    },
    settings: {
      react: {
        version: 'detect' // Automatically detect React version
      }
    }
  },
  {
    // Prettier integration to avoid conflicts between ESLint and Prettier
    files: ['**/*.{js,jsx,ts,tsx}'], // Apply Prettier to these file types
    plugins: {
      prettier
    },
    rules: {
      ...prettier.rules // Prettier rules override other formatting rules
    }
  }
]
