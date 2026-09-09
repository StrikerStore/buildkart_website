import js from '@eslint/js';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * The storefront's flat config.
 *
 * The rule worth reading is the last one. This app must not import
 * `@buildkart/core` or `@buildkart/database`: it holds no database credentials
 * and reaches its data over HTTP.
 *
 * That is a correction to the original storefront plan, which assumed the
 * storefront would query the database directly the way the admin used to. It
 * cannot: `backend/api` is the only service holding `DATABASE_URL`. The rule is
 * here from the first commit precisely so that assumption cannot creep back in
 * once real pages start being written.
 */

const IGNORES = ['**/node_modules/**', '**/.next/**', '**/.turbo/**'];

export default tseslint.config(
  { ignores: IGNORES },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Components run in a browser as well as on the server.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // The codebase uses `_`-prefixed names for deliberate discards.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  /*
   * Next's plugins, loaded directly rather than through `eslint-config-next`.
   * That preset bundles an `eslint-plugin-react` still using ESLint 9's rule
   * context API, so under the pinned ESLint 10 every file here dies with
   * "contextOrFilename.getFilename is not a function". These two are the halves
   * actually worth having, and they load cleanly on their own.
   */
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // App Router only — there is no `pages/` directory for this rule to scan.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // --- no database, no domain layer ---------------------------------------
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@buildkart/core',
              message:
                'The storefront reaches data through the API. Importing core would give this app a database dependency.',
            },
            {
              name: '@buildkart/database',
              message: 'The storefront holds no database credentials. Use the API.',
            },
          ],
        },
      ],
    },
  },

  // Config files and scripts are plain Node.
  {
    files: ['**/*.mjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
