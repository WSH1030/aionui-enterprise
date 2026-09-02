/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useReducer } from 'react';

export const SIDER_TRANSITION_DURATION_MS = 200;

export type SiderTransitionPhase = 'expanded' | 'opening' | 'closing' | 'collapsed';

export type SiderTransitionState = {
  phase: SiderTransitionPhase;
  targetCollapsed: boolean;
  layoutCollapsed: boolean;
  contentCollapsed: boolean;
};

export type SiderTransitionAction =
  | { type: 'set-target'; collapsed: boolean }
  | { type: 'set-immediate'; collapsed: boolean }
  | { type: 'complete' };

export const createSiderTransitionState = (collapsed: boolean): SiderTransitionState =>
  collapsed
    ? {
        phase: 'collapsed',
        targetCollapsed: true,
        layoutCollapsed: true,
        contentCollapsed: true,
      }
    : {
        phase: 'expanded',
        targetCollapsed: false,
        layoutCollapsed: false,
        contentCollapsed: false,
      };

export const siderTransitionReducer = (
  state: SiderTransitionState,
  action: SiderTransitionAction
): SiderTransitionState => {
  switch (action.type) {
    case 'set-immediate':
      return createSiderTransitionState(action.collapsed);
    case 'set-target':
      if (action.collapsed === state.targetCollapsed) {
        return state;
      }

      if (action.collapsed) {
        return {
          phase: 'closing',
          targetCollapsed: true,
          layoutCollapsed: true,
          contentCollapsed: false,
        };
      }

      return {
        phase: 'opening',
        targetCollapsed: false,
        layoutCollapsed: false,
        contentCollapsed: false,
      };
    case 'complete':
      if (state.phase === 'opening') {
        return createSiderTransitionState(false);
      }
      if (state.phase === 'closing') {
        return createSiderTransitionState(true);
      }
      return state;
  }
};

type UseSiderTransitionOptions = {
  isMobile: boolean;
  initialCollapsed?: boolean;
};

export const useSiderTransition = ({ isMobile, initialCollapsed = false }: UseSiderTransitionOptions) => {
  const [state, dispatch] = useReducer(siderTransitionReducer, initialCollapsed, createSiderTransitionState);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      dispatch({ type: isMobile ? 'set-immediate' : 'set-target', collapsed });
    },
    [isMobile]
  );

  const setCollapsedImmediate = useCallback((collapsed: boolean) => {
    dispatch({ type: 'set-immediate', collapsed });
  }, []);

  useEffect(() => {
    if (isMobile) {
      return undefined;
    }

    const transitionStarted = state.phase === 'opening' || state.phase === 'closing';
    if (!transitionStarted) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      dispatch({ type: 'complete' });
    }, SIDER_TRANSITION_DURATION_MS + 50);

    return () => window.clearTimeout(timeout);
  }, [isMobile, state.phase]);

  return {
    ...state,
    isAnimating: state.phase === 'opening' || state.phase === 'closing',
    setCollapsed,
    setCollapsedImmediate,
  };
};
