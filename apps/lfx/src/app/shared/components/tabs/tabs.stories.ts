// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Tabs } from './tabs';

const sampleTabs = [
  { label: 'Overview', value: 'overview', icon: 'circle-dashed' },
  { label: 'Members', value: 'members', icon: 'circle-dashed' },
  { label: 'Settings', value: 'settings', icon: 'circle-dashed' },
  { label: 'Activity', value: 'activity', icon: 'circle-dashed' },
  { label: 'Reports', value: 'reports', icon: 'circle-dashed' },
  { label: 'Billing', value: 'billing', icon: 'circle-dashed' },
];

const sampleTabsNoIcons = [
  { label: 'Overview', value: 'overview' },
  { label: 'Members', value: 'members' },
  { label: 'Settings', value: 'settings' },
  { label: 'Activity', value: 'activity' },
  { label: 'Reports', value: 'reports' },
  { label: 'Billing', value: 'billing' },
];

const meta: Meta<Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    style: {
      control: 'select',
      options: ['switch', 'bordered'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
  },
  render: (args) => ({
    props: {
      ...args,
      activeTab: 'overview',
    },
    template: `<lfx-tabs [tabs]="tabs" [style]="style" [size]="size" [(activeTab)]="activeTab" />`,
  }),
};

export default meta;
type Story = StoryObj<Tabs>;

export const SwitchDefault: Story = {
  args: { tabs: sampleTabs, style: 'switch', size: 'lg' },
};

export const SwitchSmall: Story = {
  args: { tabs: sampleTabs, style: 'switch', size: 'sm' },
};

export const BorderedDefault: Story = {
  args: { tabs: sampleTabs, style: 'bordered', size: 'lg' },
};

export const BorderedSmall: Story = {
  args: { tabs: sampleTabs, style: 'bordered', size: 'sm' },
};

export const SwitchNoIcons: Story = {
  args: { tabs: sampleTabsNoIcons, style: 'switch', size: 'lg' },
};

export const BorderedNoIcons: Story = {
  args: { tabs: sampleTabsNoIcons, style: 'bordered', size: 'lg' },
};

export const AllVariants: Story = {
  render: () => ({
    props: {
      sampleTabs,
      sampleTabsNoIcons,
      activeTab: 'overview',
    },
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Switch — Default Size</span>
          <lfx-tabs [tabs]="sampleTabs" style="switch" size="lg" [(activeTab)]="activeTab" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Switch — Small Size</span>
          <lfx-tabs [tabs]="sampleTabs" style="switch" size="sm" [(activeTab)]="activeTab" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Bordered — Default Size</span>
          <lfx-tabs [tabs]="sampleTabs" style="bordered" size="lg" [(activeTab)]="activeTab" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Bordered — Small Size</span>
          <lfx-tabs [tabs]="sampleTabs" style="bordered" size="sm" [(activeTab)]="activeTab" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Switch — No Icons</span>
          <lfx-tabs [tabs]="sampleTabsNoIcons" style="switch" size="lg" [(activeTab)]="activeTab" />
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Bordered — No Icons</span>
          <lfx-tabs [tabs]="sampleTabsNoIcons" style="bordered" size="lg" [(activeTab)]="activeTab" />
        </div>
      </div>
    `,
  }),
};
