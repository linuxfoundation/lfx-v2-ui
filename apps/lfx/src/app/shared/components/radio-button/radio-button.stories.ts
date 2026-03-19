// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { RadioButton } from './radio-button';

const meta: Meta<RadioButton> = {
  title: 'Components/RadioButton',
  component: RadioButton,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    name: { control: 'text' },
    value: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-radio-button [size]="size" [checked]="checked" [disabled]="disabled" [label]="label" [name]="name" [value]="value" />`,
  }),
};

export default meta;
type Story = StoryObj<RadioButton>;

export const Default: Story = {
  args: { checked: false, size: 'lg', label: 'Radio label' },
};

export const DefaultSmall: Story = {
  args: { checked: false, size: 'sm', label: 'Radio label' },
};

export const Selected: Story = {
  args: { checked: true, size: 'lg', label: 'Radio label' },
};

export const SelectedSmall: Story = {
  args: { checked: true, size: 'sm', label: 'Radio label' },
};

export const Disabled: Story = {
  args: { disabled: true, size: 'lg', label: 'Radio label' },
};

export const DisabledSelected: Story = {
  args: { checked: true, disabled: true, size: 'lg', label: 'Radio label' },
};

export const WithoutLabel: Story = {
  args: { checked: false, size: 'lg' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="grid grid-cols-2 gap-6 items-start">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Unselected</span>
          <lfx-radio-button size="lg" label="Large" />
          <lfx-radio-button size="sm" label="Small" />
          <lfx-radio-button size="lg" [disabled]="true" label="Large disabled" />
          <lfx-radio-button size="sm" [disabled]="true" label="Small disabled" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Selected</span>
          <lfx-radio-button size="lg" [checked]="true" label="Large" />
          <lfx-radio-button size="sm" [checked]="true" label="Small" />
          <lfx-radio-button size="lg" [checked]="true" [disabled]="true" label="Large disabled" />
          <lfx-radio-button size="sm" [checked]="true" [disabled]="true" label="Small disabled" />
        </div>
      </div>
    `,
  }),
};
