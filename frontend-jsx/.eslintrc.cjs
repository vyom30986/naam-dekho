/**
 * Frontend lint rules.
 *
 * Deliberately narrow: this is here to catch real defects — unused variables
 * left behind by edits, missing hook dependencies, unreachable code — not to
 * argue about formatting.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react', 'react-hooks'],
  rules: {
    // We do not use PropTypes anywhere in this codebase.
    'react/prop-types': 'off',
    // The new JSX transform means React need not be in scope.
    'react/react-in-jsx-scope': 'off',
    // Legal pages render trusted build-time HTML we authored ourselves.
    'react/no-danger': 'off',
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'public/'],
}
