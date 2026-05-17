"use client";

import { useState } from "react";

export function usePaginatedItems<T>(items: T[], pageSize: number) {
  const [requestedPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    currentPage,
    paginatedItems,
    setCurrentPage,
    totalPages,
  };
}
