// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Avatar } from './avatar';

const meta: Meta<Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    name: { control: 'text' },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    type: {
      control: 'select',
      options: ['photo', 'placeholder', 'initials', 'org-logo', 'project-placeholder', 'org-placeholder'],
    },
  },
};

export default meta;
type Story = StoryObj<Avatar>;

export const PhotoAvatar: Story = {
  args: { src: 'https://i.pravatar.cc/150', alt: 'User avatar', size: 'md', type: 'photo' },
};

export const PhotoPlaceholder: Story = {
  args: { size: 'md', type: 'placeholder' },
};

export const Initials: Story = {
  args: { name: 'Jane Doe', size: 'md', type: 'initials' },
};

export const OrgLogo: Story = {
  args: { src: 'https://i.pravatar.cc/150', alt: 'Organization logo', size: 'md', type: 'org-logo' },
};

export const ProjectPlaceholder: Story = {
  args: { size: 'md', type: 'project-placeholder' },
};

export const OrgPlaceholder: Story = {
  args: { size: 'md', type: 'org-placeholder' },
};

export const ExtraSmall: Story = {
  args: { name: 'John Smith', size: 'xs', type: 'initials' },
};

export const Small: Story = {
  args: { name: 'John Smith', size: 'sm', type: 'initials' },
};

export const Medium: Story = {
  args: { src: 'https://i.pravatar.cc/150', alt: 'User avatar', size: 'md', type: 'photo' },
};

export const Large: Story = {
  args: { src: 'https://i.pravatar.cc/150', alt: 'User avatar', size: 'lg', type: 'photo' },
};

export const ExtraLarge: Story = {
  args: { src: 'https://i.pravatar.cc/150', alt: 'User avatar', size: 'xl', type: 'photo' },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Photo — All Sizes</span>
          <div class="flex items-end gap-3">
            <lfx-avatar size="xs" src="https://i.pravatar.cc/150?u=1" alt="User" type="photo" />
            <lfx-avatar size="sm" src="https://i.pravatar.cc/150?u=1" alt="User" type="photo" />
            <lfx-avatar size="md" src="https://i.pravatar.cc/150?u=1" alt="User" type="photo" />
            <lfx-avatar size="lg" src="https://i.pravatar.cc/150?u=1" alt="User" type="photo" />
            <lfx-avatar size="xl" src="https://i.pravatar.cc/150?u=1" alt="User" type="photo" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Initials — All Sizes</span>
          <div class="flex items-end gap-3">
            <lfx-avatar size="xs" name="Jane Doe" type="initials" />
            <lfx-avatar size="sm" name="Jane Doe" type="initials" />
            <lfx-avatar size="md" name="Jane Doe" type="initials" />
            <lfx-avatar size="lg" name="Jane Doe" type="initials" />
            <lfx-avatar size="xl" name="Jane Doe" type="initials" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Placeholders</span>
          <div class="flex items-end gap-3">
            <lfx-avatar size="md" type="placeholder" />
            <lfx-avatar size="md" type="project-placeholder" />
            <lfx-avatar size="md" type="org-placeholder" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Org Logo — All Sizes</span>
          <div class="flex items-end gap-3">
            <lfx-avatar size="xs" src="https://i.pravatar.cc/150?u=org" alt="Org" type="org-logo" />
            <lfx-avatar size="sm" src="https://i.pravatar.cc/150?u=org" alt="Org" type="org-logo" />
            <lfx-avatar size="md" src="https://i.pravatar.cc/150?u=org" alt="Org" type="org-logo" />
            <lfx-avatar size="lg" src="https://i.pravatar.cc/150?u=org" alt="Org" type="org-logo" />
            <lfx-avatar size="xl" src="https://i.pravatar.cc/150?u=org" alt="Org" type="org-logo" />
          </div>
        </div>
      </div>
    `,
  }),
};
