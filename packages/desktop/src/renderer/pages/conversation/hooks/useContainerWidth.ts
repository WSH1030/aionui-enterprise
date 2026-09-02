import { useCallback, useEffect, useRef, useState } from 'react';

type UseContainerWidthReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerWidth: number;
};

type UseContainerWidthOptions = {
  /**
   * Defer ResizeObserver state updates while an outer layout transition is
   * running. The latest measured width is published once the transition ends.
   */
  deferUpdates?: boolean;
};

/**
 * Tracks the width of a container element using ResizeObserver,
 * falling back to window.innerWidth when the element is not yet mounted.
 */
export function useContainerWidth({ deferUpdates = false }: UseContainerWidthOptions = {}): UseContainerWidthReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const deferUpdatesRef = useRef(deferUpdates);
  const deferredWidthRef = useRef<number | null>(null);
  deferUpdatesRef.current = deferUpdates;

  const commitWidth = useCallback((width: number) => {
    if (deferUpdatesRef.current) {
      deferredWidthRef.current = width;
      return;
    }
    setContainerWidth((previousWidth) => (previousWidth === width ? previousWidth : width));
  }, []);

  useEffect(() => {
    if (deferUpdates) {
      return;
    }
    const deferredWidth = deferredWidthRef.current;
    if (deferredWidth === null) {
      return;
    }
    deferredWidthRef.current = null;
    commitWidth(deferredWidth);
  }, [commitWidth, deferUpdates]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      commitWidth(typeof window === 'undefined' ? 0 : window.innerWidth);
      return;
    }
    commitWidth(element.offsetWidth);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      commitWidth(entries[0].contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [commitWidth]);

  return { containerRef, containerWidth };
}
