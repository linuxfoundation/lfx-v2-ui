// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { ToggleSwitch } from './toggle-switch';

const meta: Meta<ToggleSwitch> = {
  title: 'Components/ToggleSwitch',
  component: ToggleSwitch,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-toggle-switch [size]="size" [checked]="checked" [disabled]="disabled" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<ToggleSwitch>;

export const Default: Story = {
  args: { checked: false, size: 'lg', label: 'Toggle label' },
};

export const DefaultSmall: Story = {
  args: { checked: false, size: 'sm', label: 'Toggle label' },
};

export const On: Story = {
  args: { checked: true, size: 'lg', label: 'Toggle label' },
};

export const OnSmall: Story = {
  args: { checked: true, size: 'sm', label: 'Toggle label' },
};

export const Disabled: Story = {
  args: { disabled: true, size: 'lg', label: 'Toggle label' },
};

export const DisabledOn: Story = {
  args: { checked: true, disabled: true, size: 'lg', label: 'Toggle label' },
};

export const DisabledSmall: Story = {
  args: { disabled: true, size: 'sm', label: 'Toggle label' },
};

export const DisabledOnSmall: Story = {
  args: { checked: true, disabled: true, size: 'sm', label: 'Toggle label' },
};

export const WithoutLabel: Story = {
  args: { checked: false, size: 'lg' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="grid grid-cols-2 gap-6 items-start">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Off</span>
          <lfx-toggle-switch size="lg" label="Large" />
          <lfx-toggle-switch size="sm" label="Small" />
          <lfx-toggle-switch size="lg" [disabled]="true" label="Large disabled" />
          <lfx-toggle-switch size="sm" [disabled]="true" label="Small disabled" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">On</span>
          <lfx-toggle-switch size="lg" [checked]="true" label="Large" />
          <lfx-toggle-switch size="sm" [checked]="true" label="Small" />
          <lfx-toggle-switch size="lg" [checked]="true" [disabled]="true" label="Large disabled" />
          <lfx-toggle-switch size="sm" [checked]="true" [disabled]="true" label="Small disabled" />
        </div>
      </div>
    `,
  }),
};
