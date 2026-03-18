// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

module.exports = {
  printWidth: 160,
  singleQuote: true,
  useTabs: false,
  tabWidth: 2,
  semi: true,
  bracketSpacing: true,
  arrowParens: 'always',
  trailingComma: 'es5',
  bracketSameLine: true,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
  overrides: [
    { files: ['*.json'], options: { trailingComma: 'none' } },
    { files: '*.html', options: { parser: 'angular' } },
  ],
};
