/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Tooltip } from '@arco-design/web-react';
import { FolderClose, FolderOpen, Right } from '@icon-park/react';
import classNames from 'classnames';
import React from 'react';

type ProjectSidebarToggleProps = {
  collapsed: boolean;
  displayName: string;
  expanded: boolean;
  onToggle: () => void;
};

const ProjectSidebarToggle: React.FC<ProjectSidebarToggleProps> = ({ collapsed, displayName, expanded, onToggle }) => (
  <Tooltip content={displayName} position='right'>
    <Button
      type='text'
      long
      style={{ paddingLeft: 0, paddingRight: 0 }}
      className={classNames(
        '!h-34px !flex !items-center !justify-start !px-0 !rd-8px !text-t-primary',
        collapsed && '!justify-center'
      )}
      onClick={onToggle}
    >
      {expanded ? (
        <FolderOpen theme='outline' size='16' fill='currentColor' className='shrink-0' />
      ) : (
        <FolderClose theme='outline' size='16' fill='currentColor' className='shrink-0' />
      )}
      {!collapsed && <span className='ms-8px min-w-0 truncate text-14px font-[500]'>{displayName}</span>}
      {!collapsed && (
        <Right
          theme='outline'
          size={12}
          className={classNames('ms-auto shrink-0 transition-transform', { 'rotate-90': expanded })}
        />
      )}
    </Button>
  </Tooltip>
);

export default ProjectSidebarToggle;
