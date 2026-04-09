"use client";

import { Search } from "lucide-react";
import type { RefObject } from "react";
import { useLocale } from "@/components/providers/locale-provider";

type EditorSearchPopoverProps = {
  onCloseOtherMenus: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSearchChange: (value: string) => void;
  open: boolean;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  searchHeaderLabel: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchMenuRef: RefObject<HTMLDivElement | null>;
  searchNotice: string | null;
  searchQuery: string;
  setOpen: (value: boolean | ((current: boolean) => boolean)) => void;
};

export function EditorSearchPopover({
  onCloseOtherMenus,
  onNext,
  onPrevious,
  onSearchChange,
  open,
  searchButtonRef,
  searchHeaderLabel,
  searchInputRef,
  searchMenuRef,
  searchNotice,
  searchQuery,
  setOpen,
}: EditorSearchPopoverProps) {
  const { t } = useLocale();
  return (
    <div className="relative">
      <button
        className="flex size-9 items-center justify-center border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
        onClick={() => {
          setOpen((current) => !current);
          onCloseOtherMenus();
        }}
        ref={searchButtonRef}
        type="button"
      >
        <Search className="size-3.5 text-[var(--color-muted-foreground)]" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-20 w-[320px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
          ref={searchMenuRef}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("search")}
              </label>
              <span className="w-28 text-right text-xs tabular-nums text-[var(--color-muted-foreground)]">
                {searchHeaderLabel}
              </span>
            </div>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-card)] px-3">
              <Search className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                name="document-search"
                onChange={(event) => {
                  onSearchChange(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    onNext();
                  }
                }}
                placeholder={t("findInDocument")}
                ref={searchInputRef}
                value={searchQuery}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-8 flex-1 border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm transition hover:bg-[var(--color-hover)]"
                onClick={onPrevious}
                type="button"
              >
                {t("previous")}
              </button>
              <button
                className="h-8 flex-1 border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm transition hover:bg-[var(--color-hover)]"
                onClick={onNext}
                type="button"
              >
                {t("next")}
              </button>
            </div>
            {searchNotice && searchNotice !== t("noMatchFound") ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {searchNotice}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
