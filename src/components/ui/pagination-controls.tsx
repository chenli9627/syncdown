"use client";

type PaginationControlsProps = {
  currentPage: number;
  locale: "zh" | "en";
  onNext: () => void;
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
  onPrevious,
  previousLabel,
  nextLabel,
  totalItems,
  totalPages,
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
      <p className="text-[12px] leading-5 text-[var(--color-muted-foreground)]">
        {formatPaginationStatus(locale, currentPage, totalPages)}
      </p>
      <div className="flex items-center gap-2">
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
