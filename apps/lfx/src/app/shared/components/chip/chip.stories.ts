// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Chip } from './chip';

const meta: Meta<Chip> = {
  title: 'Components/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    chipStyle: {
      control: 'select',
      options: ['bordered', 'neutral'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
    type: {
      control: 'select',
      options: ['label', 'icon', 'avatar-photo', 'avatar-logo'],
    },
    icon: { control: 'text' },
    avatarSrc: { control: 'text' },
    dismissable: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-chip [chipStyle]="chipStyle" [size]="size" [type]="type" [icon]="icon" [avatarSrc]="avatarSrc" [dismissable]="dismissable" [label]="label" />`,
  }),
};

export default meta;
type Story = StoryObj<Chip>;

export const BorderedLabel: Story = {
  args: { chipStyle: 'bordered', size: 'lg', type: 'label', label: 'Tag' },
};

export const NeutralLabel: Story = {
  args: { chipStyle: 'neutral', size: 'lg', type: 'label', label: 'Tag' },
};

export const BorderedSmall: Story = {
  args: { chipStyle: 'bordered', size: 'sm', type: 'label', label: 'Tag' },
};

export const NeutralSmall: Story = {
  args: { chipStyle: 'neutral', size: 'sm', type: 'label', label: 'Tag' },
};

export const WithIcon: Story = {
  args: { chipStyle: 'bordered', size: 'lg', type: 'icon', icon: 'tag', label: 'Category' },
};

export const WithIconSmall: Story = {
  args: { chipStyle: 'bordered', size: 'sm', type: 'icon', icon: 'tag', label: 'Category' },
};

export const WithAvatarPhoto: Story = {
  args: {
    chipStyle: 'bordered',
    size: 'lg',
    type: 'avatar-photo',
    avatarSrc: 'https://i.pravatar.cc/48',
    label: 'Jane Doe',
  },
};

export const WithAvatarLogo: Story = {
  args: {
    chipStyle: 'bordered',
    size: 'lg',
    type: 'avatar-logo',
    avatarSrc: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg',
    label: 'Linux Foundation',
  },
};

export const Dismissable: Story = {
  args: { chipStyle: 'bordered', size: 'lg', type: 'label', label: 'Removable', dismissable: true },
};

export const DismissableWithIcon: Story = {
  args: { chipStyle: 'neutral', size: 'lg', type: 'icon', icon: 'tag', label: 'Filter', dismissable: true },
};

export const DismissableSmall: Story = {
  args: { chipStyle: 'bordered', size: 'sm', type: 'label', label: 'Removable', dismissable: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Bordered (Large)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-chip chipStyle="bordered" label="Label Only" />
            <lfx-chip chipStyle="bordered" type="icon" icon="tag" label="With Icon" />
            <lfx-chip chipStyle="bordered" type="avatar-photo" avatarSrc="https://i.pravatar.cc/48" label="Photo Avatar" />
            <lfx-chip chipStyle="bordered" type="avatar-logo" avatarSrc="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" label="Org Logo" />
            <lfx-chip chipStyle="bordered" [dismissable]="true" label="Dismissable" />
            <lfx-chip chipStyle="bordered" type="icon" icon="tag" [dismissable]="true" label="Icon + Dismiss" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Bordered (Small)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-chip chipStyle="bordered" size="sm" label="Label Only" />
            <lfx-chip chipStyle="bordered" size="sm" type="icon" icon="tag" label="With Icon" />
            <lfx-chip chipStyle="bordered" size="sm" type="avatar-photo" avatarSrc="https://i.pravatar.cc/48" label="Photo Avatar" />
            <lfx-chip chipStyle="bordered" size="sm" type="avatar-logo" avatarSrc="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" label="Org Logo" />
            <lfx-chip chipStyle="bordered" size="sm" [dismissable]="true" label="Dismissable" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Neutral (Large)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-chip chipStyle="neutral" label="Label Only" />
            <lfx-chip chipStyle="neutral" type="icon" icon="tag" label="With Icon" />
            <lfx-chip chipStyle="neutral" type="avatar-photo" avatarSrc="https://i.pravatar.cc/48" label="Photo Avatar" />
            <lfx-chip chipStyle="neutral" type="avatar-logo" avatarSrc="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" label="Org Logo" />
            <lfx-chip chipStyle="neutral" [dismissable]="true" label="Dismissable" />
            <lfx-chip chipStyle="neutral" type="icon" icon="tag" [dismissable]="true" label="Icon + Dismiss" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Neutral (Small)</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-chip chipStyle="neutral" size="sm" label="Label Only" />
            <lfx-chip chipStyle="neutral" size="sm" type="icon" icon="tag" label="With Icon" />
            <lfx-chip chipStyle="neutral" size="sm" type="avatar-photo" avatarSrc="https://i.pravatar.cc/48" label="Photo Avatar" />
            <lfx-chip chipStyle="neutral" size="sm" type="avatar-logo" avatarSrc="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" label="Org Logo" />
            <lfx-chip chipStyle="neutral" size="sm" [dismissable]="true" label="Dismissable" />
          </div>
        </div>
      </div>
    `,
  }),
};
