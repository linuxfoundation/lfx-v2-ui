// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { LinkButton } from './link-button';

const meta: Meta<LinkButton> = {
  title: 'Components/LinkButton',
  component: LinkButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['accent', 'neutral'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    disabled: { control: 'boolean' },
    underline: { control: 'boolean' },
    leftIcon: { control: 'text' },
    rightIcon: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-link-button [variant]="variant" [size]="size" [disabled]="disabled" [underline]="underline" [leftIcon]="leftIcon" [rightIcon]="rightIcon">Link Button</lfx-link-button>`,
  }),
};

export default meta;
type Story = StoryObj<LinkButton>;

export const Default: Story = {
  args: { variant: 'accent', size: 'lg' },
};

export const AccentSmall: Story = {
  args: { variant: 'accent', size: 'sm' },
};

export const Neutral: Story = {
  args: { variant: 'neutral', size: 'lg' },
};

export const NeutralSmall: Story = {
  args: { variant: 'neutral', size: 'sm' },
};

export const WithLeftIcon: Story = {
  args: { variant: 'accent', size: 'lg', leftIcon: 'arrow-left' },
};

export const WithRightIcon: Story = {
  args: { variant: 'accent', size: 'lg', rightIcon: 'arrow-right' },
};

export const WithBothIcons: Story = {
  args: { variant: 'accent', size: 'lg', leftIcon: 'arrow-left', rightIcon: 'arrow-right' },
};

export const UnderlineOnHover: Story = {
  args: { variant: 'accent', size: 'lg', underline: true },
};

export const Disabled: Story = {
  args: { variant: 'accent', size: 'lg', disabled: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-6">
          <span class="w-20 text-xs text-neutral-400">Accent LG</span>
          <lfx-link-button variant="accent" size="lg">Link Button</lfx-link-button>
          <lfx-link-button variant="accent" size="lg" leftIcon="arrow-left">With Icon</lfx-link-button>
          <lfx-link-button variant="accent" size="lg" [underline]="true">Underline</lfx-link-button>
          <lfx-link-button variant="accent" size="lg" [disabled]="true">Disabled</lfx-link-button>
        </div>
        <div class="flex items-center gap-6">
          <span class="w-20 text-xs text-neutral-400">Accent SM</span>
          <lfx-link-button variant="accent" size="sm">Link Button</lfx-link-button>
          <lfx-link-button variant="accent" size="sm" leftIcon="arrow-left">With Icon</lfx-link-button>
          <lfx-link-button variant="accent" size="sm" [underline]="true">Underline</lfx-link-button>
          <lfx-link-button variant="accent" size="sm" [disabled]="true">Disabled</lfx-link-button>
        </div>
        <div class="flex items-center gap-6">
          <span class="w-20 text-xs text-neutral-400">Neutral LG</span>
          <lfx-link-button variant="neutral" size="lg">Link Button</lfx-link-button>
          <lfx-link-button variant="neutral" size="lg" leftIcon="arrow-left">With Icon</lfx-link-button>
          <lfx-link-button variant="neutral" size="lg" [underline]="true">Underline</lfx-link-button>
          <lfx-link-button variant="neutral" size="lg" [disabled]="true">Disabled</lfx-link-button>
        </div>
        <div class="flex items-center gap-6">
          <span class="w-20 text-xs text-neutral-400">Neutral SM</span>
          <lfx-link-button variant="neutral" size="sm">Link Button</lfx-link-button>
          <lfx-link-button variant="neutral" size="sm" leftIcon="arrow-left">With Icon</lfx-link-button>
          <lfx-link-button variant="neutral" size="sm" [underline]="true">Underline</lfx-link-button>
          <lfx-link-button variant="neutral" size="sm" [disabled]="true">Disabled</lfx-link-button>
        </div>
      </div>
    `,
  }),
};
