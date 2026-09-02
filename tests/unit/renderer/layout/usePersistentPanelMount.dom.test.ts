import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePersistentPanelMount } from '@renderer/hooks/ui/usePersistentPanelMount';

describe('usePersistentPanelMount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts once, reveals on the next frame, and keeps the panel mounted after closing', () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });

    const { result, rerender } = renderHook(({ open }) => usePersistentPanelMount({ open }), {
      initialProps: { open: false },
    });

    expect(result.current).toEqual({ mounted: false, visible: false });

    rerender({ open: true });
    expect(result.current).toEqual({ mounted: true, visible: false });

    act(() => {
      frameCallback?.(0);
    });
    expect(result.current).toEqual({ mounted: true, visible: true });

    rerender({ open: false });
    expect(result.current).toEqual({ mounted: true, visible: false });
  });
});
