import { useEffect, useState } from 'react';

export type PersistentPanelMountOptions = {
  open: boolean;
  enabled?: boolean;
};

export type PersistentPanelMountState = {
  mounted: boolean;
  visible: boolean;
};

/**
 * Mount a panel on its first open and keep it mounted afterwards.
 *
 * The first open is revealed on the next animation frame so the caller can
 * render the closed layout state before the browser starts the width transition.
 * Keeping the panel mounted preserves its internal state and avoids remount
 * flicker when a user toggles it repeatedly.
 */
export function usePersistentPanelMount({ open, enabled = true }: PersistentPanelMountOptions) {
  const initiallyOpen = enabled && open;
  const [mounted, setMounted] = useState(initiallyOpen);
  const [visible, setVisible] = useState(initiallyOpen);

  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      setVisible(false);
      return undefined;
    }

    if (!open) {
      setVisible(false);
      return undefined;
    }

    setMounted(true);
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [enabled, open]);

  return {
    mounted,
    visible: enabled && visible,
  } satisfies PersistentPanelMountState;
}
