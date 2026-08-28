/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_RECENT_WS_KEY = 'aionui:recent-workspaces';
export const RECENT_WORKSPACES_CHANGED_EVENT = 'aionui:recent-workspaces-changed';
const MAX_RECENT_WORKSPACES = 5;

const notifyRecentWorkspacesChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_WORKSPACES_CHANGED_EVENT));
  }
};

export const getRecentWorkspaces = (storageKey: string = DEFAULT_RECENT_WS_KEY): string[] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  } catch {
    return [];
  }
};

export const addRecentWorkspace = (path: string, storageKey: string = DEFAULT_RECENT_WS_KEY): void => {
  try {
    const prev = getRecentWorkspaces(storageKey);
    const next = [path, ...prev.filter((item) => item !== path)].slice(0, MAX_RECENT_WORKSPACES);
    localStorage.setItem(storageKey, JSON.stringify(next));
    notifyRecentWorkspacesChanged();
  } catch {}
};
