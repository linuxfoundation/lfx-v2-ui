// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Badge } from './badge';

const meta: Meta<Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'discovery'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    contrast: { control: 'boolean' },
    icon: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-badge [variant]="variant" [size]="size" [contrast]="contrast" [icon]="icon">Tag</lfx-badge>`,
  }),
};

export default meta;
type Story = StoryObj<Badge>;

export const Neutral: Story = {
  args: { variant: 'neutral', size: 'sm' },
};

export const Info: Story = {
  args: { variant: 'info', size: 'sm' },
};

export const Success: Story = {
  args: { variant: 'success', size: 'sm' },
};

export const Warning: Story = {
  args: { variant: 'warning', size: 'sm' },
};

export const Danger: Story = {
  args: { variant: 'danger', size: 'sm' },
};

export const Discovery: Story = {
  args: { variant: 'discovery', size: 'sm' },
};

export const NeutralContrast: Story = {
  args: { variant: 'neutral', size: 'sm', contrast: true },
};

export const InfoContrast: Story = {
  args: { variant: 'info', size: 'sm', contrast: true },
};

export const SuccessContrast: Story = {
  args: { variant: 'success', size: 'sm', contrast: true },
};

export const WarningContrast: Story = {
  args: { variant: 'warning', size: 'sm', contrast: true },
};

export const DangerContrast: Story = {
  args: { variant: 'danger', size: 'sm', contrast: true },
};

export const DiscoveryContrast: Story = {
  args: { variant: 'discovery', size: 'sm', contrast: true },
};

export const LargeSize: Story = {
  args: { variant: 'info', size: 'lg' },
};

export const WithIcon: Story = {
  args: { variant: 'info', size: 'sm', icon: 'circle-check' },
};

export const WithIconContrast: Story = {
  args: { variant: 'success', size: 'lg', contrast: true, icon: 'circle-check' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Default (Small)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-badge variant="neutral">Neutral</lfx-badge>
            <lfx-badge variant="info">Info</lfx-badge>
            <lfx-badge variant="success">Success</lfx-badge>
            <lfx-badge variant="warning">Warning</lfx-badge>
            <lfx-badge variant="danger">Danger</lfx-badge>
            <lfx-badge variant="discovery">Discovery</lfx-badge>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Default (Large)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-badge variant="neutral" size="lg">Neutral</lfx-badge>
            <lfx-badge variant="info" size="lg">Info</lfx-badge>
            <lfx-badge variant="success" size="lg">Success</lfx-badge>
            <lfx-badge variant="warning" size="lg">Warning</lfx-badge>
            <lfx-badge variant="danger" size="lg">Danger</lfx-badge>
            <lfx-badge variant="discovery" size="lg">Discovery</lfx-badge>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Contrast (Small)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-badge variant="neutral" [contrast]="true">Neutral</lfx-badge>
            <lfx-badge variant="info" [contrast]="true">Info</lfx-badge>
            <lfx-badge variant="success" [contrast]="true">Success</lfx-badge>
            <lfx-badge variant="warning" [contrast]="true">Warning</lfx-badge>
            <lfx-badge variant="danger" [contrast]="true">Danger</lfx-badge>
            <lfx-badge variant="discovery" [contrast]="true">Discovery</lfx-badge>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">With Icons</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-badge variant="info" icon="circle-info">Info</lfx-badge>
            <lfx-badge variant="success" icon="circle-check">Success</lfx-badge>
            <lfx-badge variant="warning" icon="triangle-exclamation">Warning</lfx-badge>
            <lfx-badge variant="danger" icon="circle-xmark">Danger</lfx-badge>
            <lfx-badge variant="success" size="lg" [contrast]="true" icon="circle-check">Contrast</lfx-badge>
          </div>
        </div>
      </div>
    `,
  }),
};
