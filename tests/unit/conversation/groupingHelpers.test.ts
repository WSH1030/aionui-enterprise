/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { TChatConversation } from '@/common/config/storage';
import type { SidebarResponse } from '@/common/types/sidebar';
import {
  buildBackendSidebarView,
  buildProjectSidebarRows,
  mergeBackendProjectsWithRecentWorkspaces,
  buildGroupedHistory,
  buildProjectSidebarEntries,
  buildRecentConversationList,
} from '@/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers';

const t = (key: string): string => key;

const conversation = (id: string, extra: TChatConversation['extra'], modified_at: number): TChatConversation =>
  ({
    id,
    name: id,
    type: 'acp',
    created_at: modified_at,
    modified_at,
    extra,
  }) as TChatConversation;

describe('buildGroupedHistory', () => {
  it('keeps scheduled-task conversations in the regular conversation timeline', () => {
    const result = buildGroupedHistory(
      [conversation('cron-conversation', { backend: 'aioncore', cron_job_id: 'job-1' }, 100)],
      t
    );

    expect(result.timelineSections[0]?.items).toEqual([
      expect.objectContaining({
        type: 'conversation',
        conversation: expect.objectContaining({ id: 'cron-conversation' }),
      }),
    ]);
  });

  it('keeps scheduled-task conversations with workspaces in the project section', () => {
    const result = buildGroupedHistory(
      [
        conversation(
          'cron-project-conversation',
          {
            backend: 'aioncore',
            cron_job_id: 'job-1',
            workspace: '/repo/aionui',
            custom_workspace: true,
          },
          100
        ),
      ],
      t
    );

    expect(result.timelineSections[0]?.items).toEqual([
      expect.objectContaining({
        type: 'workspace',
        workspaceGroup: expect.objectContaining({
          workspace: '/repo/aionui',
          conversations: [expect.objectContaining({ id: 'cron-project-conversation' })],
        }),
      }),
    ]);
  });

  it('continues to hide team-owned conversations from the regular history', () => {
    const result = buildGroupedHistory(
      [conversation('team-conversation', { backend: 'aioncore', team_id: 'team-1' }, 100)],
      t
    );

    expect(result.timelineSections).toEqual([]);
  });
});

describe('buildProjectSidebarEntries', () => {
  it('keeps a recently added workspace visible before it has a conversation', () => {
    const result = buildProjectSidebarEntries(
      [
        {
          timeline: 'recent',
          items: [
            {
              type: 'workspace',
              time: 100,
              workspaceGroup: {
                workspace: 'D:/work/existing',
                display_name: 'existing',
                conversations: [
                  conversation('existing-chat', { workspace: 'D:/work/existing', custom_workspace: true }, 100),
                ],
              },
            },
          ],
        },
      ],
      ['D:/work/new', 'D:/work/existing'],
      t
    );

    expect(result.map((entry) => entry.workspace)).toEqual(['D:/work/new', 'D:/work/existing']);
    expect(result[0]?.displayName).toBe('new');
    expect(result[0]?.conversations).toEqual([]);
    expect(result[1]?.conversations).toHaveLength(1);
  });

  it('returns no projects when there are no workspaces or recent paths', () => {
    expect(buildProjectSidebarEntries([], [], t)).toEqual([]);
  });
});

describe('buildRecentConversationList', () => {
  it('sorts conversations by activity and omits pinned conversations', () => {
    const pinned = conversation('pinned', {}, 300);
    const older = conversation('older', {}, 100);
    const newer = conversation('newer', {}, 200);

    expect(buildRecentConversationList([older, pinned, newer], [pinned]).map(({ id }) => id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('returns an empty list for an empty conversation history', () => {
    expect(buildRecentConversationList([], [])).toEqual([]);
  });
});

describe('buildBackendSidebarView', () => {
  it('uses backend groups for projects, pinned conversations, and recent chats', () => {
    const pinned = conversation('pinned', {}, 300);
    const projectChat = conversation('project-chat', {}, 200);
    const recentChat = conversation('recent-chat', {}, 100);
    const response: SidebarResponse = {
      has_more_groups: false,
      groups: [
        {
          scope: { type: 'pinned' },
          items: [{ type: 'conversation', conversation: pinned }],
          has_more: false,
        },
        {
          scope: { type: 'project', project_id: 'project-1', name: '项目一', workspace: 'file:///D:/work/project-1' },
          items: [{ type: 'conversation', conversation: projectChat }],
          has_more: false,
        },
        {
          scope: { type: 'chats' },
          items: [{ type: 'conversation', conversation: recentChat }],
          has_more: false,
        },
      ],
    };

    expect(buildBackendSidebarView(response)).toEqual({
      projects: [
        {
          key: 'project:project-1',
          projectId: 'project-1',
          workspace: 'D:\\work\\project-1',
          displayName: '项目一',
          conversations: [projectChat],
          hasMore: false,
        },
      ],
      pinnedConversations: [pinned],
      recentConversations: [recentChat],
    });
  });

  it('renders directory groups as projects without inventing a project id', () => {
    const response: SidebarResponse = {
      has_more_groups: false,
      groups: [
        {
          scope: { type: 'dir', key: 'dir-1', path: 'D:/work', name: 'work' },
          items: [],
          has_more: true,
          next_cursor: 'cursor-1',
        },
      ],
    };

    expect(buildBackendSidebarView(response).projects).toEqual([
      {
        key: 'dir:dir-1',
        displayName: 'work',
        workspace: 'D:/work',
        conversations: [],
        hasMore: true,
      },
    ]);
  });
});

describe('mergeBackendProjectsWithRecentWorkspaces', () => {
  it('keeps a selected local folder until the backend creates its project record', () => {
    const backendProjects = [
      {
        key: 'project:project-1',
        projectId: 'project-1',
        workspace: 'D:/work/existing',
        displayName: 'existing',
        conversations: [],
        hasMore: false,
      },
    ];

    const result = mergeBackendProjectsWithRecentWorkspaces(backendProjects, ['D:/work/new', 'D:/work/existing'], t);

    expect(result.map((project) => project.workspace)).toEqual(['D:/work/existing', 'D:/work/new']);
    expect(result[1]).toMatchObject({ key: 'local:D:/work/new', displayName: 'new' });
  });
});

describe('buildProjectSidebarRows', () => {
  it('adds indented conversation rows only when the project is expanded', () => {
    const project = {
      key: 'project:project-1',
      projectId: 'project-1',
      workspace: 'D:/work/project-1',
      displayName: '项目一',
      conversations: [conversation('project-chat', {}, 100)],
      hasMore: false,
    };

    expect(buildProjectSidebarRows([project], new Set())).toEqual([{ kind: 'project', project }]);
    expect(buildProjectSidebarRows([project], new Set([project.key]))).toEqual([
      { kind: 'project', project },
      { kind: 'conversation', projectKey: project.key, conversation: project.conversations[0] },
    ]);
  });
});
