/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveAgentDisplayName, resolveAgentLogo, useAgentLogos } from '@/renderer/utils/model/agentLogo';
import { iconColors } from '@/renderer/styles/colors';
import appLogo from '@renderer/assets/logos/brand/app.png';
import { Robot } from '@icon-park/react';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemedLogo from './ThemedLogo';

export type AgentBadgeProps = {
  /** Agent backend type */
  backend?: string;
  /** Display name for the agent */
  agent_name?: string;
  /** Custom agent logo (SVG path or emoji string) */
  agentLogo?: string;
  /** Whether the logo is an emoji */
  agentLogoIsEmoji?: boolean;
  /** Whether the explicit assistant logo is intentionally empty. */
  agentLogoIsFallback?: boolean;
  /** Assistant ID — when provided, clicking the badge navigates to AssistantSettings */
  assistantId?: string;
};

/** Render agent logo from custom logo, backend logo, or fallback Robot icon */
export const AgentLogoIcon: React.FC<
  Pick<AgentBadgeProps, 'backend' | 'agentLogo' | 'agentLogoIsEmoji' | 'agentLogoIsFallback' | 'agent_name'>
> = ({ backend, agentLogo, agentLogoIsEmoji, agentLogoIsFallback, agent_name }) => {
  const logos = useAgentLogos();
  const displayName = resolveAgentDisplayName({ backend, agentName: agent_name });
  const logoContent = (() => {
    const normalizedBackend = backend?.trim().toLowerCase();
    const isAionCli = normalizedBackend === 'aionrs' || agent_name?.trim().toLowerCase() === 'aion cli';
    if (isAionCli) {
      return <img src={appLogo} alt={`${displayName} logo`} className='block w-16px h-16px object-contain' />;
    }
    if (agentLogoIsFallback) {
      return <Robot theme='outline' size={16} fill={iconColors.primary} />;
    }
    if (agentLogo) {
      if (agentLogoIsEmoji) {
        return <span className='text-14px leading-none'>{agentLogo}</span>;
      }
      return <ThemedLogo src={agentLogo} alt={`${displayName} logo`} className='block w-16px h-16px object-contain' />;
    }
    const logo = resolveAgentLogo(logos, { backend });
    if (logo) {
      return <ThemedLogo src={logo} alt={`${displayName} logo`} className='block w-16px h-16px object-contain' />;
    }
    return <Robot theme='outline' size={16} fill={iconColors.primary} />;
  })();

  return (
    <span className='inline-flex w-16px h-16px items-center justify-center shrink-0 leading-none'>{logoContent}</span>
  );
};

/**
 * AgentBadge - Agent identity badge (logo + name)
 *
 * When `assistantId` is provided, clicking navigates to AssistantSettings editor.
 * Otherwise renders as a static display badge.
 */
const AgentBadge: React.FC<AgentBadgeProps> = ({
  backend,
  agent_name,
  agentLogo,
  agentLogoIsEmoji,
  agentLogoIsFallback,
  assistantId,
}) => {
  const navigate = useNavigate();
  const displayName = resolveAgentDisplayName({ backend, agentName: agent_name });
  const handleClick = useCallback(() => {
    if (!assistantId) return;
    navigate(`/settings/assistants?highlight=${encodeURIComponent(assistantId)}`);
  }, [assistantId, navigate]);

  return (
    <div
      className={`flex items-center gap-2 bg-2 w-fit rounded-full px-[8px] py-[2px] ${assistantId ? 'cursor-pointer hover:bg-3' : ''}`}
      data-testid='agent-badge'
      onClick={handleClick}
    >
      <AgentLogoIcon
        backend={backend}
        agent_name={agent_name}
        agentLogo={agentLogo}
        agentLogoIsEmoji={agentLogoIsEmoji}
        agentLogoIsFallback={agentLogoIsFallback}
      />
      <span className='text-sm text-t-primary'>{displayName}</span>
    </div>
  );
};

export default AgentBadge;
