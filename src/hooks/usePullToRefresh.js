import { useState, useEffect, useRef } from "react";

/**
 * Pull-to-refresh hook for mobile.
 * Returns { isPulling, pullProgress (0-1), isRefreshing }
 * @param {function} onRefresh - async function to call on refresh
 * @param {object} options
 */
export function usePullToRefresh(onRefresh, { threshold = 72, resistance = 2.5 } = {}) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    const el = document.documentElement;

    const onTouchStart = (e) => {
      if (el.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!pullingRef.current || startYRef.current === null) return;
      if (el.scrollTop > 0) { pullingRef.current = false; return; }
      const delta = (e.touches[0].clientY - startYRef.current) / resistance;
      if (delta > 0) {
        e.preventDefault();
        setPullY(Math.min(delta, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullY >= threshold) {
        setIsRefreshing(true);
        setPullY(threshold);
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullY(0);
      startYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullY, threshold, resistance]);

  return {
    pullY,
    pullProgress: Math.min(pullY / threshold, 1),
    isRefreshing,
  };
}