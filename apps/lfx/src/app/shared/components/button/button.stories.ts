// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Button } from './button';

const meta: Meta<Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'outline', 'ghost-accent', 'ghost-neutral', 'destructive', 'ghost-destructive', 'bordered'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    leftIcon: { control: 'text' },
    rightIcon: { control: 'text' },
    iconOnly: { control: 'boolean' },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-button [variant]="variant" [size]="size" [loading]="loading" [disabled]="disabled" [leftIcon]="leftIcon" [rightIcon]="rightIcon" [type]="type" [iconOnly]="iconOnly">Button</lfx-button>`,
  }),
};

export default meta;
type Story = StoryObj<Button>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'lg' },
};

export const PrimarySmall: Story = {
  args: { variant: 'primary', size: 'sm' },
};

export const Outline: Story = {
  args: { variant: 'outline', size: 'lg' },
};

export const GhostAccent: Story = {
  args: { variant: 'ghost-accent', size: 'lg' },
};

export const GhostNeutral: Story = {
  args: { variant: 'ghost-neutral', size: 'lg' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', size: 'lg' },
};

export const GhostDestructive: Story = {
  args: { variant: 'ghost-destructive', size: 'lg' },
};

export const WithLeftIcon: Story = {
  args: { variant: 'primary', size: 'lg', leftIcon: 'plus' },
};

export const WithRightIcon: Story = {
  args: { variant: 'primary', size: 'lg', rightIcon: 'arrow-right' },
};

export const WithBothIcons: Story = {
  args: { variant: 'primary', size: 'lg', leftIcon: 'circle-dashed', rightIcon: 'circle-dashed' },
};

export const Loading: Story = {
  args: { variant: 'primary', size: 'lg', loading: true },
};

export const Disabled: Story = {
  args: { variant: 'primary', size: 'lg', disabled: true },
};

export const DestructiveDisabled: Story = {
  args: { variant: 'destructive', size: 'lg', disabled: true },
};

export const OutlineSmall: Story = {
  args: { variant: 'outline', size: 'sm' },
};

export const GhostNeutralWithIcon: Story = {
  args: { variant: 'ghost-neutral', size: 'lg', leftIcon: 'gear' },
};

export const Bordered: Story = {
  args: { variant: 'bordered', size: 'lg' },
};

export const IconOnlyPrimary: Story = {
  args: { variant: 'primary', size: 'lg', iconOnly: true, leftIcon: 'plus' },
};

export const IconOnlyPrimarySmall: Story = {
  args: { variant: 'primary', size: 'sm', iconOnly: true, leftIcon: 'plus' },
};

export const IconOnlyBordered: Story = {
  args: { variant: 'bordered', size: 'lg', iconOnly: true, leftIcon: 'ellipsis' },
};

export const IconOnlyGhostAccent: Story = {
  args: { variant: 'ghost-accent', size: 'lg', iconOnly: true, leftIcon: 'pen' },
};

export const IconOnlyGhostNeutral: Story = {
  args: { variant: 'ghost-neutral', size: 'lg', iconOnly: true, leftIcon: 'xmark' },
};

export const IconOnlyDisabled: Story = {
  args: { variant: 'primary', size: 'lg', iconOnly: true, leftIcon: 'plus', disabled: true },
};

export const IconOnlyLoading: Story = {
  args: { variant: 'primary', size: 'lg', iconOnly: true, leftIcon: 'plus', loading: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Variants (Large)</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary">Primary</lfx-button>
            <lfx-button variant="outline">Outline</lfx-button>
            <lfx-button variant="ghost-accent">Ghost Accent</lfx-button>
            <lfx-button variant="ghost-neutral">Ghost Neutral</lfx-button>
            <lfx-button variant="destructive">Destructive</lfx-button>
            <lfx-button variant="ghost-destructive">Ghost Destructive</lfx-button>
            <lfx-button variant="bordered">Bordered</lfx-button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Variants (Small)</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary" size="sm">Primary</lfx-button>
            <lfx-button variant="outline" size="sm">Outline</lfx-button>
            <lfx-button variant="ghost-accent" size="sm">Ghost Accent</lfx-button>
            <lfx-button variant="ghost-neutral" size="sm">Ghost Neutral</lfx-button>
            <lfx-button variant="destructive" size="sm">Destructive</lfx-button>
            <lfx-button variant="ghost-destructive" size="sm">Ghost Destructive</lfx-button>
            <lfx-button variant="bordered" size="sm">Bordered</lfx-button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">With Icons</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary" leftIcon="plus">Left Icon</lfx-button>
            <lfx-button variant="primary" rightIcon="arrow-right">Right Icon</lfx-button>
            <lfx-button variant="outline" leftIcon="download" rightIcon="arrow-down">Both Icons</lfx-button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Icon Only</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary" [iconOnly]="true" leftIcon="plus"></lfx-button>
            <lfx-button variant="primary" size="sm" [iconOnly]="true" leftIcon="plus"></lfx-button>
            <lfx-button variant="bordered" [iconOnly]="true" leftIcon="ellipsis"></lfx-button>
            <lfx-button variant="ghost-accent" [iconOnly]="true" leftIcon="pen"></lfx-button>
            <lfx-button variant="ghost-neutral" [iconOnly]="true" leftIcon="xmark"></lfx-button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Disabled</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary" [disabled]="true">Primary</lfx-button>
            <lfx-button variant="destructive" [disabled]="true">Destructive</lfx-button>
            <lfx-button variant="outline" [disabled]="true">Outline</lfx-button>
            <lfx-button variant="ghost-accent" [disabled]="true">Ghost</lfx-button>
            <lfx-button variant="bordered" [disabled]="true">Bordered</lfx-button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Loading</span>
          <div class="flex flex-wrap items-center gap-3">
            <lfx-button variant="primary" [loading]="true">Primary</lfx-button>
            <lfx-button variant="primary" [iconOnly]="true" [loading]="true" leftIcon="plus"></lfx-button>
          </div>
        </div>
      </div>
    `,
  }),
};
