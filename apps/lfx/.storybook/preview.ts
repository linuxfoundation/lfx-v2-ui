// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Preview } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';

import '../src/styles.css';
setCompodocJson(docJson);

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        method: 'alphabetical',
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Toggle dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (story, context) => {
      const theme = context.globals['theme'] || 'light';
      document.body.classList.toggle('dark', theme === 'dark');
      return story();
    },
  ],
};

export default preview;
