// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { TooltipTrigger } from './tooltip-trigger';

const meta: Meta<TooltipTrigger> = {
  title: 'Components/Tooltip',
  component: TooltipTrigger,
  tags: ['autodocs'],
  argTypes: {
    lfxTooltip: { control: 'text' },
    lfxTooltipDescription: { control: 'text' },
    lfxTooltipPosition: { control: 'select', options: ['top', 'bottom'] },
  },
};

export default meta;
type Story = StoryObj<TooltipTrigger>;

export const Simple: Story = {
  render: (args) => ({
    props: args,
    template: `<button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" [lfxTooltip]="lfxTooltip" type="button">Hover me</button>`,
    moduleMetadata: { imports: [TooltipTrigger] },
  }),
  args: { lfxTooltip: 'Tooltip label' },
};

export const WithDescription: Story = {
  render: (args) => ({
    props: args,
    template: `<button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" [lfxTooltip]="lfxTooltip" [lfxTooltipDescription]="lfxTooltipDescription" type="button">Hover me</button>`,
    moduleMetadata: { imports: [TooltipTrigger] },
  }),
  args: { lfxTooltip: 'Tooltip label', lfxTooltipDescription: 'This is a short description for the tooltip.' },
};

export const LongDescription: Story = {
  render: (args) => ({
    props: args,
    template: `<button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" [lfxTooltip]="lfxTooltip" [lfxTooltipDescription]="lfxTooltipDescription" type="button">Hover me</button>`,
    moduleMetadata: { imports: [TooltipTrigger] },
  }),
  args: {
    lfxTooltip: 'Tooltip label',
    lfxTooltipDescription:
      'This is a longer description that demonstrates how the tooltip handles wrapping text across multiple lines within the max width constraint.',
  },
};

export const PositionBottom: Story = {
  render: (args) => ({
    props: args,
    template: `<div class="pt-16"><button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" [lfxTooltip]="lfxTooltip" lfxTooltipPosition="bottom" type="button">Hover me (bottom)</button></div>`,
    moduleMetadata: { imports: [TooltipTrigger] },
  }),
  args: { lfxTooltip: 'Tooltip below' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-8 p-8">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Simple</span>
          <div class="flex flex-wrap items-start gap-4">
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="Tooltip label" type="button">Short label</button>
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="This is a longer tooltip label text" type="button">Long label</button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">With Description</span>
          <div class="flex flex-wrap items-start gap-4">
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="Tooltip label" lfxTooltipDescription="This is a short description for the tooltip." type="button">Short description</button>
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="Tooltip label" lfxTooltipDescription="This is a longer description that demonstrates how the tooltip handles wrapping text across multiple lines within the max width constraint." type="button">Long description</button>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Position</span>
          <div class="flex flex-wrap items-start gap-4 pt-16">
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="Top tooltip" type="button">Top (default)</button>
            <button class="rounded-md bg-info-500 px-4 py-2 text-sm text-white" lfxTooltip="Bottom tooltip" lfxTooltipPosition="bottom" type="button">Bottom</button>
          </div>
        </div>
      </div>
    `,
    moduleMetadata: { imports: [TooltipTrigger] },
  }),
};
