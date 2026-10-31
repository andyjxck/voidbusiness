module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    'react-native/react-native': true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]],
    },
  },
  plugins: ['react', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'warn',
  },
  settings: {
    react: { version: '19' },
  },
  ignorePatterns: ['node_modules/', 'dist/', 'ios/', 'android/', '__tests__/snapshots/'],
};
