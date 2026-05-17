"use client";

import { useEffect, useState } from "react";

type PaginationControlsProps = {
  currentPage: number;
  locale: "zh" | "en";
  onNext: () => void;
  onPageSelect: (page: number) => void;
  onPrevious: () => void;
  previousLabel: string;
  nextLabel: string;
  totalItems: number;
  totalPages: number;
};

export function PaginationControls({
  currentPage,
  locale,
  onNext,
  onPageSelect,
  onPrevious,
  previousLabel,
  nextLabel,
  totalItems,
  totalPages,
}: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function submitPageInput() {
    const parsedPage = Number.parseInt(pageInput, 10);

    if (Number.isNaN(parsedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    const targetPage = Math.max(1, Math.min(totalPages, parsedPage));
    setPageInput(String(targetPage));
    onPageSelect(targetPage);
  }

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
      <p className="text-[12px] leading-5 text-[var(--color-muted-foreground)]">
        {formatPaginationStatus(locale, currentPage, totalPages)}
      </p>
      <div className="flex items-center gap-2">
        {totalPages > 1 ? (
          <label className="flex items-center gap-2 text-[12px] text-[var(--color-muted-foreground)]">
            <span>{locale === "zh" ? "跳至" : "Go to"}</span>
            <input
              aria-label={locale === "zh" ? "输入页码" : "Enter page number"}
              className="w-14 border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[12px] text-[var(--color-foreground)] outline-none transition hover:bg-[var(--color-hover)] focus:border-[var(--color-foreground)]"
              inputMode="numeric"
              max={totalPages}
              min={1}
              onBlur={submitPageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitPageInput();
                }
              }}
              type="number"
              value={pageInput}
            />
            <span>/ {totalPages}</span>
          </label>
        ) : null}
        <button
          className="border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage <= 1}
          onClick={onPrevious}
          type="button"
        >
          {previousLabel}
        </button>
        <button
          className="border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage >= totalPages}
          onClick={onNext}
          type="button"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function formatPaginationStatus(
  locale: "zh" | "en",
  currentPage: number,
  totalPages: number,
) {
  if (locale === "zh") {
    return `第 ${currentPage} / ${totalPages} 页`;
  }

  return `Page ${currentPage} of ${totalPages}`;
}
