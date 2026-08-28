/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/config/storage';
import type { SidebarResponse } from '@/common/types/sidebar';
import { ipcBridge } from '@/common';
import AionModal from '@/renderer/components/base/AionModal';
import { useCronJobsMap } from '@/renderer/pages/cron';
import { restrictToVerticalAxis } from '@/renderer/utils/ui/dndModifiers';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Dropdown, Empty, Input, Menu, Modal, Tooltip } from '@arco-design/web-react';
import { FolderClose, MoreOne, Plus, Right } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
  DEFAULT_RECENT_WS_KEY,
  RECENT_WORKSPACES_CHANGED_EVENT,
  addRecentWorkspace,
  getRecentWorkspaces,
} from '@/renderer/components/workspace/recentWorkspaces';
import ConversationRow from './ConversationRow';
import SortableConversationRow from './SortableConversationRow';
import { useBatchSelection } from './hooks/useBatchSelection';
import { useConversationActions } from './hooks/useConversationActions';
import { useConversations } from './hooks/useConversations';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import type { ConversationRowProps, WorkspaceGroupedHistoryProps } from './types';
import { addEventListener } from '@/renderer/utils/emitter';
import {
  buildBackendSidebarView,
  buildProjectSidebarEntries,
  buildProjectSidebarRows,
  buildRecentConversationList,
  mergeBackendProjectsWithRecentWorkspaces,
} from './utils/groupingHelpers';

const WorkspaceGroupedHistory: React.FC<WorkspaceGroupedHistoryProps> = ({
  onSessionClick,
  collapsed = false,
  tooltipEnabled = false,
  batchMode = false,
  onBatchModeChange,
  afterPinnedContent,
}) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>(() => getRecentWorkspaces(DEFAULT_RECENT_WS_KEY));
  const [sidebarResponse, setSidebarResponse] = useState<SidebarResponse>();
  const { getJobStatus, markAsRead, setActiveConversation } = useCronJobsMap();

  const {
    conversations,
    isConversationGenerating,
    hasCompletionUnread,
    isManualUnread,
    markManualUnread,
    clearManualUnread,
    expandedWorkspaces,
    pinnedConversations,
    timelineSections,
    handleToggleWorkspace,
    collapsedSections,
    toggleSection,
  } = useConversations();

  const refreshSidebar = useCallback(async () => {
    try {
      const response = await ipcBridge.sidebar.get.invoke({ limit: 100 });
      setSidebarResponse(response);
    } catch (error) {
      console.error('Failed to load backend sidebar:', error);
    }
  }, []);

  useEffect(() => {
    void refreshSidebar();
    return addEventListener('chat.history.refresh', () => {
      void refreshSidebar();
    });
  }, [refreshSidebar]);

  const SectionLabel = useCallback(
    ({ sectionKey, label, trailing }: { sectionKey: string; label: string; trailing?: React.ReactNode }) => {
      const isCollapsed = collapsedSections.has(sectionKey);
      return (
        <div
          className='group/label sider-section-label flex items-center px-12px h-28px select-none sticky top-0 z-10 mt-8px cursor-pointer'
          onClick={() => toggleSection(sectionKey)}
        >
          <span className='text-14px text-t-tertiary sider-section-title group-hover/label:text-t-primary transition-colors font-[500] leading-none'>
            {label}
          </span>
          <span className='ms-2px flex items-center justify-center opacity-0 group-hover/label:opacity-100 transition-opacity text-t-tertiary shrink-0'>
            <Right
              theme='outline'
              size={12}
              className={classNames('transition-transform duration-150', { 'rotate-90': !isCollapsed })}
            />
          </span>
          {trailing && (
            <div className='ms-auto' onClick={(e) => e.stopPropagation()}>
              {trailing}
            </div>
          )}
        </div>
      );
    },
    [collapsedSections, toggleSection]
  );

  // Sync active conversation ref when route changes (for URL navigation)
  // This doesn't trigger state update, avoiding double render
  useEffect(() => {
    if (id) {
      setActiveConversation(id);
    }
  }, [id, setActiveConversation]);

  const {
    selectedConversationIds,
    setSelectedConversationIds,
    selectedCount,
    allSelected,
    toggleSelectedConversation,
    handleToggleSelectAll,
  } = useBatchSelection(batchMode, conversations);

  const {
    renameModalVisible,
    renameModalName,
    setRenameModalName,
    renameLoading,
    dropdownVisibleId,
    handleConversationClick,
    handleArchive,
    handleBatchArchive,
    handleEditStart,
    handleRenameConfirm,
    handleRenameCancel,
    handleTogglePin,
    handleMenuVisibleChange,
    handleOpenMenu,
    handleToggleManualUnread,
    handleCreateCronTask,
    handleArchiveProject,
    archiveProjectTarget,
    archiveProjectLoading,
    handleArchiveProjectCancel,
    handleArchiveProjectConfirm,
  } = useConversationActions({
    batchMode,
    onSessionClick,
    onBatchModeChange,
    selectedConversationIds,
    setSelectedConversationIds,
    toggleSelectedConversation,
    markAsRead,
    markManualUnread,
    clearManualUnread,
    isManualUnread,
  });

  const { sensors, handleDragEnd, isDragEnabled } = useDragAndDrop({
    pinnedConversations,
    batchMode,
    collapsed,
  });

  // Fork-lineage badge support: resolve a parent conversation's display name
  // from the already-loaded sidebar list (no extra fetch; unresolved = the
  // parent was deleted or not loaded → the badge falls back to a generic tip).
  const conversationNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const conversation of conversations) {
      map.set(conversation.id, conversation.name);
    }
    return map;
  }, [conversations]);
  const resolveConversationName = useCallback(
    (conversationId: string) => conversationNameById.get(conversationId),
    [conversationNameById]
  );

  const getConversationRowProps = useCallback(
    (conversation: TChatConversation): ConversationRowProps => ({
      conversation,
      isGenerating: isConversationGenerating(conversation.id),
      hasUnread: hasCompletionUnread(conversation.id) || isManualUnread(conversation.id),
      isManualUnread: isManualUnread(conversation.id),
      collapsed,
      tooltipEnabled,
      batchMode,
      checked: selectedConversationIds.has(conversation.id),
      selected: id === conversation.id,
      menuVisible: dropdownVisibleId !== null && dropdownVisibleId === conversation.id,
      onToggleChecked: toggleSelectedConversation,
      onConversationClick: handleConversationClick,
      onOpenMenu: handleOpenMenu,
      onMenuVisibleChange: handleMenuVisibleChange,
      onEditStart: handleEditStart,
      onCreateCronTask: handleCreateCronTask,
      onArchive: handleArchive,
      onTogglePin: handleTogglePin,
      onToggleManualUnread: handleToggleManualUnread,
      getJobStatus,
      resolveConversationName,
    }),
    [
      collapsed,
      tooltipEnabled,
      batchMode,
      isConversationGenerating,
      hasCompletionUnread,
      isManualUnread,
      selectedConversationIds,
      id,
      dropdownVisibleId,
      toggleSelectedConversation,
      handleConversationClick,
      handleOpenMenu,
      handleMenuVisibleChange,
      handleEditStart,
      handleCreateCronTask,
      handleArchive,
      handleTogglePin,
      handleToggleManualUnread,
      getJobStatus,
      resolveConversationName,
    ]
  );

  const renderConversation = (conversation: TChatConversation, dimIcon = false) => {
    const rowProps = getConversationRowProps(conversation);
    return <ConversationRow key={conversation.id} {...rowProps} dimIcon={dimIcon} />;
  };

  useEffect(() => {
    const handleRecentWorkspacesChanged = () => {
      setRecentWorkspaces(getRecentWorkspaces(DEFAULT_RECENT_WS_KEY));
    };

    window.addEventListener(RECENT_WORKSPACES_CHANGED_EVENT, handleRecentWorkspacesChanged);
    return () => window.removeEventListener(RECENT_WORKSPACES_CHANGED_EVENT, handleRecentWorkspacesChanged);
  }, []);

  const handleAddProject = useCallback(async () => {
    try {
      const files = await ipcBridge.dialog.showOpen.invoke({ properties: ['openDirectory', 'createDirectory'] });
      const workspace = files?.[0];
      if (!workspace) return;

      addRecentWorkspace(workspace, DEFAULT_RECENT_WS_KEY);
      setRecentWorkspaces(getRecentWorkspaces(DEFAULT_RECENT_WS_KEY));
    } catch (error) {
      console.error('Failed to add project workspace:', error);
    }
  }, []);

  // Keep project folders above a flat, most-recent-first conversation list.
  const projectGroups = useMemo(() => {
    const backendView = buildBackendSidebarView(sidebarResponse);
    if (sidebarResponse) {
      return mergeBackendProjectsWithRecentWorkspaces(backendView.projects, recentWorkspaces, t);
    }

    return buildProjectSidebarEntries(timelineSections, recentWorkspaces, t).map((project) => ({
      key: `local:${project.workspace}`,
      workspace: project.workspace,
      displayName: project.displayName,
      conversations: project.conversations,
      hasMore: false,
    }));
  }, [recentWorkspaces, sidebarResponse, t, timelineSections]);

  const projectRows = useMemo(
    () => buildProjectSidebarRows(projectGroups, collapsed ? new Set() : new Set(expandedWorkspaces)),
    [collapsed, expandedWorkspaces, projectGroups]
  );

  const recentConversationList = useMemo(
    () =>
      sidebarResponse
        ? buildBackendSidebarView(sidebarResponse).recentConversations
        : buildRecentConversationList(conversations, pinnedConversations),
    [conversations, pinnedConversations, sidebarResponse]
  );

  const displayPinnedConversations = sidebarResponse
    ? buildBackendSidebarView(sidebarResponse).pinnedConversations
    : pinnedConversations;
  const pinnedIds = useMemo(() => displayPinnedConversations.map((c) => c.id), [displayPinnedConversations]);

  const hasNoHistory =
    projectGroups.length === 0 && recentConversationList.length === 0 && displayPinnedConversations.length === 0;

  return (
    <>
      <Modal
        title={t('conversation.history.renameTitle')}
        visible={renameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText={t('conversation.history.saveName')}
        cancelText={t('conversation.history.cancelEdit')}
        confirmLoading={renameLoading}
        okButtonProps={{ disabled: !renameModalName.trim() }}
        style={{ borderRadius: '12px' }}
        alignCenter
        getPopupContainer={() => document.body}
      >
        <Input
          autoFocus
          value={renameModalName}
          onChange={setRenameModalName}
          onPressEnter={handleRenameConfirm}
          placeholder={t('conversation.history.renamePlaceholder')}
          allowClear
        />
      </Modal>

      {batchMode && !collapsed && (
        <div className='px-12px pb-8px pt-2px sticky top-0 z-20 bg-[var(--bg-2)]'>
          <div className='rd-8px bg-fill-1 p-10px flex flex-col gap-8px border border-solid border-[rgba(var(--primary-6),0.08)]'>
            <div className='text-12px leading-18px text-t-secondary'>
              {t('conversation.history.selectedCount', { count: selectedCount })}
            </div>
            <div className='grid grid-cols-2 gap-6px'>
              <Button
                className='!w-full !justify-center !min-w-0 !h-30px !px-8px !text-12px whitespace-nowrap'
                size='mini'
                type='secondary'
                onClick={handleToggleSelectAll}
              >
                {allSelected ? t('common.cancel') : t('conversation.history.selectAll')}
              </Button>
              <Button
                className='!w-full !justify-center !min-w-0 !h-30px !px-8px !text-12px whitespace-nowrap'
                size='mini'
                type='primary'
                onClick={handleBatchArchive}
              >
                {t('conversation.history.batchArchive')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 归档项目确认弹窗 — 使用项目自家 AionModal + 圆角线框按钮（归档为非危险态，用主色） */}
      <AionModal
        visible={archiveProjectTarget !== null}
        style={{ width: '400px' }}
        header={{
          title: t('conversation.history.archiveProjectTitle'),
          showClose: true,
          style: { borderBottom: 'none' },
        }}
        onCancel={handleArchiveProjectCancel}
        footer={
          <div className='flex justify-end gap-12px pt-16px'>
            <button
              type='button'
              className='px-24px py-8px rounded-20px text-14px font-medium transition-all'
              style={{
                border: '1px solid var(--color-border-2)',
                backgroundColor: 'var(--color-fill-2)',
                color: 'var(--color-text-1)',
                cursor: archiveProjectLoading ? 'not-allowed' : 'pointer',
                opacity: archiveProjectLoading ? 0.55 : 1,
              }}
              onMouseEnter={(event) => {
                if (!archiveProjectLoading) event.currentTarget.style.backgroundColor = 'var(--color-fill-3)';
              }}
              onMouseLeave={(event) => {
                if (!archiveProjectLoading) event.currentTarget.style.backgroundColor = 'var(--color-fill-2)';
              }}
              onClick={handleArchiveProjectCancel}
              disabled={archiveProjectLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type='button'
              className='px-24px py-8px rounded-20px text-14px font-medium transition-all'
              style={{
                border: '1px solid rgb(var(--primary-6))',
                backgroundColor: 'transparent',
                color: 'rgb(var(--primary-6))',
                cursor: archiveProjectLoading ? 'not-allowed' : 'pointer',
                opacity: archiveProjectLoading ? 0.55 : 1,
              }}
              onMouseEnter={(event) => {
                if (!archiveProjectLoading) {
                  event.currentTarget.style.backgroundColor = 'rgba(var(--primary-6), 0.08)';
                }
              }}
              onMouseLeave={(event) => {
                if (!archiveProjectLoading) event.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => void handleArchiveProjectConfirm()}
              disabled={archiveProjectLoading}
            >
              {archiveProjectLoading ? t('conversation.history.archiving') : t('conversation.history.archiveProject')}
            </button>
          </div>
        }
      >
        <div className='text-14px leading-22px text-t-secondary'>
          {t('conversation.history.archiveProjectConfirm', {
            name: archiveProjectTarget?.name ?? '',
            count: archiveProjectTarget?.conversations.length ?? 0,
          })}
        </div>
      </AionModal>

      <div>
        {/* L1: Pinned section */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          {displayPinnedConversations.length > 0 && (
            <div className='min-w-0'>
              {!collapsed && <SectionLabel sectionKey='pinned' label={t('conversation.history.pinnedSection')} />}
              {!collapsedSections.has('pinned') && (
                <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy}>
                  <div className='min-w-0'>
                    {displayPinnedConversations.map((conversation) => {
                      const props = getConversationRowProps(conversation);
                      return isDragEnabled ? (
                        <SortableConversationRow key={conversation.id} {...props} />
                      ) : (
                        <ConversationRow key={conversation.id} {...props} />
                      );
                    })}
                  </div>
                </SortableContext>
              )}
            </div>
          )}
        </DndContext>

        {/* Optional content supplied by a parent after the pinned section. */}
        {afterPinnedContent}

        {/* L1: Projects section — backend projects plus pending local shortcuts */}
        <div className='min-w-0'>
          {!collapsed && (
            <SectionLabel
              sectionKey='projects'
              label={t('conversation.history.projectsSection')}
              trailing={
                <Tooltip content={t('common.add')} position='top'>
                  <Button
                    type='text'
                    size='mini'
                    aria-label={t('common.add')}
                    icon={<Plus theme='outline' size='14' fill='currentColor' />}
                    onClick={() => void handleAddProject()}
                  />
                </Tooltip>
              }
            />
          )}
          {!collapsedSections.has('projects') &&
            projectRows.map((row) => {
              if (row.kind === 'conversation') {
                return (
                  <div key={`${row.projectKey}:${row.conversation.id}`}>
                    {renderConversation(row.conversation, true)}
                  </div>
                );
              }

              const group = row.project;
              const projectMenu = group.conversations.length > 0 && (
                <Menu
                  onClickMenuItem={(key) => {
                    if (key === 'archive') {
                      handleArchiveProject(group.displayName, group.conversations);
                    }
                  }}
                >
                  <Menu.Item key='archive'>
                    <span className='flex items-center gap-8px'>
                      <FolderClose theme='outline' size='14' />
                      {t('conversation.history.archiveProject')}
                    </span>
                  </Menu.Item>
                </Menu>
              );

              return (
                <div key={group.key} className={classNames('group flex items-center gap-2px', !collapsed && 'px-12px')}>
                  <Tooltip content={group.displayName} position='right'>
                    <Button
                      type='text'
                      long
                      className={classNames(
                        '!h-34px !justify-start !px-0 !rd-8px !text-t-primary',
                        collapsed && '!justify-center'
                      )}
                      onClick={() => handleToggleWorkspace(group.key)}
                    >
                      <FolderClose theme='outline' size='16' fill='currentColor' className='shrink-0' />
                      {!collapsed && (
                        <span className='ms-8px min-w-0 truncate text-14px font-[500]'>{group.displayName}</span>
                      )}
                      {!collapsed && (
                        <Right
                          theme='outline'
                          size={12}
                          className={classNames('ms-auto shrink-0 transition-transform', {
                            'rotate-90': expandedWorkspaces.includes(group.key),
                          })}
                        />
                      )}
                    </Button>
                  </Tooltip>
                  {!collapsed && (
                    <div className='flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100'>
                      <Tooltip content={t('conversation.history.newConversationInProject')} position='top'>
                        <Button
                          type='text'
                          size='mini'
                          aria-label={t('conversation.history.newConversationInProject')}
                          icon={<Plus theme='outline' size='14' fill='currentColor' />}
                          disabled={!group.workspace}
                          onClick={() => void navigate('/guid', { state: { workspace: group.workspace } })}
                        />
                      </Tooltip>
                      {projectMenu && (
                        <Dropdown
                          droplist={projectMenu}
                          trigger='click'
                          position='br'
                          getPopupContainer={() => document.body}
                          unmountOnExit={false}
                        >
                          <Button
                            type='text'
                            size='mini'
                            aria-label={t('common.more')}
                            icon={<MoreOne theme='outline' size='14' fill='currentColor' />}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </Dropdown>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* L1: Recent section — one flat list in activity order */}
        <div className='min-w-0'>
          {!collapsed && <SectionLabel sectionKey='recents' label={t('conversation.history.recents')} />}
          {!collapsedSections.has('recents') &&
            recentConversationList.map((conversation) => renderConversation(conversation))}
        </div>

        {hasNoHistory && (
          <div className='py-48px flex-center'>
            <Empty description={t('conversation.history.noHistory')} />
          </div>
        )}
      </div>
    </>
  );
};

export default WorkspaceGroupedHistory;
