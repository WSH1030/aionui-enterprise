/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import type { SidebarResponse } from '@/common/types/sidebar';
import { getActivityTime } from '@/renderer/utils/chat/timeline';
import { getWorkspaceDisplayName } from '@/renderer/utils/workspace/workspace';
import { getWorkspaceUpdateTime } from '@/renderer/utils/workspace/workspaceHistory';

import type { GroupedHistoryResult, TimelineItem, TimelineSection } from '../types';
import { getConversationSortOrder } from './sortOrderHelpers';

export type ProjectSidebarEntry = {
  workspace: string;
  displayName: string;
  conversations: TChatConversation[];
};

export type BackendProjectSidebarEntry = {
  key: string;
  projectId?: string;
  workspace?: string;
  displayName: string;
  conversations: TChatConversation[];
  hasMore: boolean;
};

export type BackendSidebarView = {
  projects: BackendProjectSidebarEntry[];
  pinnedConversations: TChatConversation[];
  recentConversations: TChatConversation[];
};

export type ProjectSidebarRow =
  | { kind: 'project'; project: BackendProjectSidebarEntry }
  | { kind: 'conversation'; projectKey: string; conversation: TChatConversation };

const workspaceUriToPath = (workspace: string | null | undefined): string | undefined => {
  if (!workspace) return undefined;
  if (!workspace.startsWith('file://')) return workspace;

  try {
    const url = new URL(workspace);
    const pathname = decodeURIComponent(url.pathname);
    if (url.hostname && url.hostname !== 'localhost') {
      return `\\\\${url.hostname}${pathname.replaceAll('/', '\\')}`;
    }
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      return pathname.slice(1).replaceAll('/', '\\');
    }
    return pathname;
  } catch {
    return workspace;
  }
};

export const isConversationPinned = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { pinned?: boolean } | undefined;
  return Boolean(extra?.pinned);
};

export const getConversationPinnedAt = (conversation: TChatConversation): number => {
  const extra = conversation.extra as { pinned_at?: number } | undefined;
  if (typeof extra?.pinned_at === 'number') {
    return extra.pinned_at;
  }
  return 0;
};

export const groupConversationsByWorkspace = (
  conversations: TChatConversation[],
  t: (key: string) => string
): TimelineSection[] => {
  const allWorkspaceGroups = new Map<string, TChatConversation[]>();
  const withoutWorkspaceConvs: TChatConversation[] = [];

  conversations.forEach((conv) => {
    const workspace = conv.extra?.workspace;
    const custom_workspace = conv.extra?.custom_workspace;

    if (custom_workspace && workspace) {
      if (!allWorkspaceGroups.has(workspace)) {
        allWorkspaceGroups.set(workspace, []);
      }
      allWorkspaceGroups.get(workspace)!.push(conv);
    } else {
      withoutWorkspaceConvs.push(conv);
    }
  });

  const items: TimelineItem[] = [];

  allWorkspaceGroups.forEach((convList, workspace) => {
    const sortedConvs = [...convList].toSorted((a, b) => getActivityTime(b) - getActivityTime(a));
    const latestConversationTime = getActivityTime(sortedConvs[0]);
    const updateTime = getWorkspaceUpdateTime(workspace);
    const time = Math.max(updateTime, latestConversationTime);
    items.push({
      type: 'workspace',
      time,
      workspaceGroup: {
        workspace,
        // This grouping path only sees custom (user-chosen) workspaces —
        // non-custom conversations end up in `withoutWorkspaceConvs` above
        // and never reach this helper. Passing `false` is therefore correct
        // without consulting `extra.is_temporary_workspace` per-row.
        display_name: getWorkspaceDisplayName(workspace, false, t),
        conversations: sortedConvs,
      },
    });
  });

  withoutWorkspaceConvs.forEach((conv) => {
    items.push({
      type: 'conversation',
      time: getActivityTime(conv),
      conversation: conv,
    });
  });

  items.sort((a, b) => b.time - a.time);

  if (items.length === 0) return [];

  return [
    {
      timeline: t('conversation.history.recents'),
      items,
    },
  ];
};

/**
 * Build the project list shown above recent conversations.
 *
 * A folder selected from the sidebar can exist before the first conversation
 * is created, so recent workspace paths are merged with workspaces discovered
 * from conversation history. Recent paths keep their order and existing
 * conversation groups are attached to them without duplication.
 */
export const buildProjectSidebarEntries = (
  timelineSections: TimelineSection[],
  recentWorkspaces: string[],
  t: (key: string) => string
): ProjectSidebarEntry[] => {
  const groupsByWorkspace = new Map<string, ProjectSidebarEntry>();

  for (const section of timelineSections) {
    for (const item of section.items) {
      if (item.type !== 'workspace' || !item.workspaceGroup) continue;

      const { workspace, display_name, conversations } = item.workspaceGroup;
      groupsByWorkspace.set(workspace, {
        workspace,
        displayName: display_name,
        conversations,
      });
    }
  }

  const entries: ProjectSidebarEntry[] = [];
  const seen = new Set<string>();
  const addEntry = (workspace: string, fallbackDisplayName?: string) => {
    if (!workspace || seen.has(workspace)) return;

    seen.add(workspace);
    const existing = groupsByWorkspace.get(workspace);
    entries.push(
      existing ?? {
        workspace,
        displayName: fallbackDisplayName ?? getWorkspaceDisplayName(workspace, false, t),
        conversations: [],
      }
    );
  };

  recentWorkspaces.forEach((workspace) => addEntry(workspace));
  groupsByWorkspace.forEach((group) => addEntry(group.workspace));

  return entries;
};

/** Return all non-pinned conversations in most-recent-first order. */
export const buildRecentConversationList = (
  conversations: TChatConversation[],
  pinnedConversations: TChatConversation[]
): TChatConversation[] => {
  const pinnedIds = new Set(pinnedConversations.map((conversation) => conversation.id));
  return conversations
    .filter((conversation) => !pinnedIds.has(conversation.id))
    .toSorted((a, b) => {
      const activityDifference = getActivityTime(b) - getActivityTime(a);
      return activityDifference !== 0 ? activityDifference : a.id.localeCompare(b.id);
    });
};

/**
 * Convert the backend sidebar read model into the three renderer sections.
 * Group classification and user scoping are intentionally left to AionCore;
 * this helper only adapts the already-ordered response for the sidebar UI.
 */
export const buildBackendSidebarView = (response: SidebarResponse | undefined): BackendSidebarView => {
  const projects: BackendProjectSidebarEntry[] = [];
  const pinnedConversations: TChatConversation[] = [];
  const recentConversations: TChatConversation[] = [];

  for (const group of response?.groups ?? []) {
    const conversations = group.items
      .filter((item): item is Extract<(typeof group.items)[number], { type: 'conversation' }> => {
        return item.type === 'conversation';
      })
      .map((item) => item.conversation);

    switch (group.scope.type) {
      case 'pinned':
        pinnedConversations.push(...conversations);
        break;
      case 'project':
        projects.push({
          key: `project:${group.scope.project_id}`,
          projectId: group.scope.project_id,
          workspace: workspaceUriToPath(group.scope.workspace),
          displayName: group.scope.name,
          conversations,
          hasMore: group.has_more,
        });
        break;
      case 'dir':
        projects.push({
          key: `dir:${group.scope.key}`,
          workspace: group.scope.path,
          displayName: group.scope.name,
          conversations,
          hasMore: group.has_more,
        });
        break;
      case 'chats':
        recentConversations.push(...conversations);
        break;
    }
  }

  return { projects, pinnedConversations, recentConversations };
};

/**
 * Keep a folder chosen in the UI visible while its first conversation is being
 * created. Once AionCore returns the real project group, the local shortcut is
 * deduplicated by workspace path.
 */
export const mergeBackendProjectsWithRecentWorkspaces = (
  projects: BackendProjectSidebarEntry[],
  recentWorkspaces: string[],
  t: (key: string) => string
): BackendProjectSidebarEntry[] => {
  const result = [...projects];
  const backendWorkspaces = new Set(projects.map((project) => project.workspace).filter(Boolean));

  for (const workspace of recentWorkspaces) {
    if (!workspace || backendWorkspaces.has(workspace)) continue;

    result.push({
      key: `local:${workspace}`,
      workspace,
      displayName: getWorkspaceDisplayName(workspace, false, t),
      conversations: [],
      hasMore: false,
    });
  }

  return result;
};

/** Build the visible parent/child rows for the project tree. */
export const buildProjectSidebarRows = (
  projects: BackendProjectSidebarEntry[],
  expandedProjectKeys: ReadonlySet<string>
): ProjectSidebarRow[] => {
  const rows: ProjectSidebarRow[] = [];
  for (const project of projects) {
    rows.push({ kind: 'project', project });
    if (!expandedProjectKeys.has(project.key)) continue;

    for (const conversation of project.conversations) {
      rows.push({ kind: 'conversation', projectKey: project.key, conversation });
    }
  }
  return rows;
};

/** Check whether a conversation belongs to a team (should be hidden from sidebar). */
const isTeamConversation = (conversation: TChatConversation): boolean => {
  const extra = conversation.extra as { team_id?: string; teamId?: string } | undefined;
  return Boolean(extra?.team_id || extra?.teamId);
};

export const buildGroupedHistory = (
  conversations: TChatConversation[],
  t: (key: string) => string
): GroupedHistoryResult => {
  // Filter out team-owned conversations; they are only visible via the Teams panel
  const visibleConversations = conversations.filter((conv) => !isTeamConversation(conv));

  const pinnedConversations = visibleConversations
    .filter((conversation) => isConversationPinned(conversation))
    .toSorted((a, b) => {
      const orderA = getConversationSortOrder(a);
      const orderB = getConversationSortOrder(b);
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;
      return getConversationPinnedAt(b) - getConversationPinnedAt(a);
    });

  const normalConversations = visibleConversations.filter((conversation) => !isConversationPinned(conversation));

  return {
    pinnedConversations,
    timelineSections: groupConversationsByWorkspace(normalConversations, t),
  };
};
