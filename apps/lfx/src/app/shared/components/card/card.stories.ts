// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Card } from './card';

const meta: Meta<Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-card [padding]="padding" [hoverable]="hoverable">
      <p class="text-text-secondary text-sm">Card content goes here</p>
    </lfx-card>`,
  }),
};

export default meta;
type Story = StoryObj<Card>;

export const Default: Story = {
  args: { padding: 'md', hoverable: false },
};

export const SmallPadding: Story = {
  args: { padding: 'sm', hoverable: false },
};

export const LargePadding: Story = {
  args: { padding: 'lg', hoverable: false },
};

export const NoPadding: Story = {
  args: { padding: 'none', hoverable: false },
};

export const Hoverable: Story = {
  args: { padding: 'md', hoverable: true },
};

export const HoverableSmall: Story = {
  args: { padding: 'sm', hoverable: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Padding Sizes</span>
          <div class="flex flex-wrap items-start gap-4">
            <lfx-card padding="none"><p class="text-sm text-neutral-600">None</p></lfx-card>
            <lfx-card padding="sm"><p class="text-sm text-neutral-600">Small padding</p></lfx-card>
            <lfx-card padding="md"><p class="text-sm text-neutral-600">Medium padding</p></lfx-card>
            <lfx-card padding="lg"><p class="text-sm text-neutral-600">Large padding</p></lfx-card>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Hoverable</span>
          <div class="flex flex-wrap items-start gap-4">
            <lfx-card padding="md" [hoverable]="true"><p class="text-sm text-neutral-600">Hover over me</p></lfx-card>
            <lfx-card padding="sm" [hoverable]="true"><p class="text-sm text-neutral-600">Hover over me (sm)</p></lfx-card>
          </div>
        </div>
      </div>
    `,
  }),
};
