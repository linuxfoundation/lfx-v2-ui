// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Checkbox } from './checkbox';

const meta: Meta<Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-checkbox [size]="size" [checked]="checked" [disabled]="disabled" [indeterminate]="indeterminate" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<Checkbox>;

export const Default: Story = {
  args: { checked: false, size: 'lg', label: 'Checkbox label' },
};

export const DefaultSmall: Story = {
  args: { checked: false, size: 'sm', label: 'Checkbox label' },
};

export const Checked: Story = {
  args: { checked: true, size: 'lg', label: 'Checkbox label' },
};

export const CheckedSmall: Story = {
  args: { checked: true, size: 'sm', label: 'Checkbox label' },
};

export const Indeterminate: Story = {
  args: { indeterminate: true, size: 'lg', label: 'Checkbox label' },
};

export const IndeterminateSmall: Story = {
  args: { indeterminate: true, size: 'sm', label: 'Checkbox label' },
};

export const Disabled: Story = {
  args: { disabled: true, size: 'lg', label: 'Checkbox label' },
};

export const DisabledChecked: Story = {
  args: { checked: true, disabled: true, size: 'lg', label: 'Checkbox label' },
};

export const DisabledIndeterminate: Story = {
  args: { indeterminate: true, disabled: true, size: 'lg', label: 'Checkbox label' },
};

export const WithoutLabel: Story = {
  args: { checked: false, size: 'lg' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="grid grid-cols-3 gap-6 items-start">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Unchecked</span>
          <lfx-checkbox size="lg" label="Large" />
          <lfx-checkbox size="sm" label="Small" />
          <lfx-checkbox size="lg" [disabled]="true" label="Large disabled" />
          <lfx-checkbox size="sm" [disabled]="true" label="Small disabled" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Checked</span>
          <lfx-checkbox size="lg" [checked]="true" label="Large" />
          <lfx-checkbox size="sm" [checked]="true" label="Small" />
          <lfx-checkbox size="lg" [checked]="true" [disabled]="true" label="Large disabled" />
          <lfx-checkbox size="sm" [checked]="true" [disabled]="true" label="Small disabled" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Indeterminate</span>
          <lfx-checkbox size="lg" [indeterminate]="true" label="Large" />
          <lfx-checkbox size="sm" [indeterminate]="true" label="Small" />
          <lfx-checkbox size="lg" [indeterminate]="true" [disabled]="true" label="Large disabled" />
          <lfx-checkbox size="sm" [indeterminate]="true" [disabled]="true" label="Small disabled" />
        </div>
      </div>
    `,
  }),
};
