/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ProjectSidebarToggle from '@/renderer/pages/conversation/GroupedHistory/ProjectSidebarToggle';

describe('ProjectSidebarToggle', () => {
  it('keeps project icons left-aligned regardless of project name length', () => {
    render(
      <ProjectSidebarToggle
        collapsed={false}
        displayName='a-project-name-with-a-different-length'
        expanded={false}
        onToggle={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button.classList.contains('!flex')).toBe(true);
    expect(button.classList.contains('!justify-start')).toBe(true);
  });
});
