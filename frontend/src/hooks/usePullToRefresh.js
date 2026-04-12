import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Pull-to-refresh hook for mobile touch gestures.
 *
 * Detects touchstart/touchmove/touchend on the document.
 * Only activates when scrollTop === 0 (top of page).
 * After pulling past threshold, triggers onRefresh callback.
 *
 * Returns { pullDistance, isRefreshing, pullState } where:
 *   - pullDistance: current px pulled (0 when idle)
 *   - isRefreshing: true while refresh is in progress
 *   - pullState: 'idle' | 'pulling' | 'ready' | 'refreshing'
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const isPulling = useRef(false);

  const pullState = isRefreshing
    ? 'refreshing'
    : pullDistance >= threshold
      ? 'ready'
      : pullDistance > 0
        ? 'pulling'
        : 'idle';

  const handleTouchStart = useCallback((e) => {
    // Only start if at top of page
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || startY.current === null) return;
    // If user scrolled down past top, cancel
    if (window.scrollY > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Apply resistance: diminishing returns past threshold
      const damped = diff < threshold ? diff : threshold + (diff - threshold) * 0.3;
      setPullDistance(damped);
      // Prevent native scroll when pulling
      if (diff > 10) e.preventDefault();
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // keep indicator visible
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    // Use passive: false for touchmove to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, pullState };
}
