"use client";

import { useCallback, useMemo, useState } from "react";
import type { UIEvent } from "react";

export function useIncrementalList<T>(items: T[], batchSize: number) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const visibleItems = useMemo(
    () => items.slice(0, Math.min(visibleCount, items.length)),
    [items, visibleCount],
  );
  const hasMore = visibleItems.length < items.length;
  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(items.length, current + batchSize));
  }, [batchSize, items.length]);
  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;

      if (remaining < 240) {
        loadMore();
      }
    },
    [loadMore],
  );

  return {
    handleScroll,
    hasMore,
    loadMore,
    visibleItems,
  };
}
