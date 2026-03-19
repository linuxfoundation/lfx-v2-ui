// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { StorybookConfig } from '@storybook/angular';

import { dirname, resolve } from 'path';

import { fileURLToPath } from 'url';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-docs')],
  framework: getAbsolutePath('@storybook/angular'),
  previewHead: (head) => `
    ${head}
    <script src="https://kit.fontawesome.com/736c27f195.js" crossorigin="anonymous"></script>
  `,
  async webpackFinal(config) {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default;
    const tailwindStylesPath = resolve(__dirname, '../src/styles.css');

    // Exclude styles.css from ALL existing CSS rules to prevent double-processing.
    // Angular's styles-webpack-plugin adds ?ngGlobalStyle and processes CSS through
    // its own opaque pipeline that doesn't support Tailwind v4's @import syntax.
    const rules = config.module?.rules || [];
    for (const rule of rules) {
      if (typeof rule === 'object' && rule !== null && rule.test instanceof RegExp && rule.test.test('.css')) {
        if (!rule.exclude) {
          rule.exclude = [];
        }
        if (Array.isArray(rule.exclude)) {
          rule.exclude.push(tailwindStylesPath);
        }
      }
    }

    // Add our own rule for styles.css with Tailwind v4 PostCSS processing.
    // This rule uses style-loader to inject CSS into the DOM, css-loader to
    // resolve @import/url(), and postcss-loader with @tailwindcss/postcss.
    config.module?.rules?.push({
      test: /\.css$/,
      include: [tailwindStylesPath],
      use: [
        'style-loader',
        { loader: 'css-loader', options: { importLoaders: 1 } },
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [tailwindPostcss],
            },
          },
        },
      ],
    });

    return config;
  },
};
export default config;
