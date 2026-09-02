/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useContainerWidth } from '@renderer/pages/conversation/hooks/useContainerWidth';

let resizeCallback: ResizeObserverCallback | undefined;

class TestResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe = vi.fn();

  disconnect = vi.fn();
}

const Harness: React.FC<{ deferUpdates: boolean }> = ({ deferUpdates }) => {
  const { containerRef, containerWidth } = useContainerWidth({ deferUpdates });
  return <div ref={containerRef} data-container-width={containerWidth} />;
};

describe('useContainerWidth deferred updates', () => {
  beforeEach(() => {
    resizeCallback = undefined;
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('publishes only the latest measured width after the deferred period ends', () => {
    const { container, rerender } = render(<Harness deferUpdates={false} />);
    const element = container.firstElementChild as HTMLElement;

    act(() => {
      resizeCallback?.([{ contentRect: { width: 320 } } as ResizeObserverEntry], {} as ResizeObserver);
    });
    expect(element.dataset.containerWidth).toBe('320');

    rerender(<Harness deferUpdates />);
    act(() => {
      resizeCallback?.([{ contentRect: { width: 240 } } as ResizeObserverEntry], {} as ResizeObserver);
      resizeCallback?.([{ contentRect: { width: 160 } } as ResizeObserverEntry], {} as ResizeObserver);
    });
    expect(element.dataset.containerWidth).toBe('320');

    rerender(<Harness deferUpdates={false} />);
    expect(element.dataset.containerWidth).toBe('160');
  });
});
