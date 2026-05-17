"use client";

import { useEffect, useRef } from "react";
import { Clock3, X } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { DocumentRecord, DocumentVersion, User } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";
import { EditorVersionHistoryPreview } from "@/features/editor/components/editor-version-history-preview";
import { usePaginatedItems } from "@/features/editor/hooks/use-paginated-items";
import { getVersionComparison } from "@/features/editor/lib/version-history";

const EMPTY_VERSIONS: DocumentVersion[] = [];
const PAGE_SIZE = 20;

type EditorVersionHistoryPanelProps = {
  canRestore: boolean;
  document: DocumentRecord;
  onClose: () => void;
  onRestore: (version: DocumentVersion) => void;
  onSelectVersion: (versionId: string) => void;
  selectedVersionId: string | null;
  users: User[];
};

export function EditorVersionHistoryPanel({
  canRestore,
  document,
  onClose,
  onRestore,
  onSelectVersion,
  selectedVersionId,
  users,
}: EditorVersionHistoryPanelProps) {
  const { locale, t } = useLocale();
  const versions = document.versionHistory ?? EMPTY_VERSIONS;
  const activeVersionId = selectedVersionId ?? versions[0]?.id ?? null;
  const selectedVersion =
    versions.find((version) => version.id === activeVersionId) ?? null;
  const versionComparison = getVersionComparison(document, selectedVersion);
  const selectedVersionIsCurrent = selectedVersion?.content === document.content;
  const { currentPage, paginatedItems, setCurrentPage, totalPages } =
    usePaginatedItems(versions, PAGE_SIZE);
  const previousActiveVersionIdRef = useRef<string | null>(activeVersionId);

  useEffect(() => {
    if (!activeVersionId) {
      return;
    }

    if (previousActiveVersionIdRef.current === activeVersionId) {
      return;
    }

    previousActiveVersionIdRef.current = activeVersionId;
    const activeIndex = versions.findIndex((version) => version.id === activeVersionId);

    if (activeIndex === -1) {
      return;
    }

    const targetPage = Math.floor(activeIndex / PAGE_SIZE) + 1;

    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [activeVersionId, currentPage, setCurrentPage, versions]);

  function changePage(nextPage: number) {
    const clampedPage = Math.max(1, Math.min(totalPages, nextPage));

    if (clampedPage === currentPage) {
      return;
    }

    setCurrentPage(clampedPage);
    const nextVersion = versions[(clampedPage - 1) * PAGE_SIZE] ?? null;

    if (nextVersion && nextVersion.id !== activeVersionId) {
      previousActiveVersionIdRef.current = nextVersion.id;
      onSelectVersion(nextVersion.id);
    }
  }

  return (
    <aside className="fixed bottom-4 left-4 right-4 top-4 z-[45] flex min-h-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)] md:left-[288px]">
      <EditorVersionHistoryPreview
        currentContent={versionComparison.currentContent}
        previousContent={versionComparison.previousContent}
        selectedVersion={selectedVersion}
      />

      <div className="flex min-h-0 w-[min(340px,34vw)] min-w-[280px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
            {t("versionHistory")}
          </h2>
          <button
            aria-label={t("close")}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {versions.length > 0 ? (
            <>
              {paginatedItems.map((entry) => {
                const active = entry.id === activeVersionId;

                return (
                  <button
                    className={`block w-full px-4 py-2.5 text-left transition ${
                      active
                        ? "bg-[var(--color-hover)]"
                        : "hover:bg-[color-mix(in_srgb,var(--color-hover)_65%,transparent)]"
                    }`}
                    key={entry.id}
                    onClick={() => onSelectVersion(entry.id)}
                    type="button"
                  >
                    <span className="block text-sm leading-5 text-[var(--color-foreground)]">
                      {formatVersionTime(entry.createdAt, locale)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {getUserName(users, entry.userId) ?? t("unknownUser")}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center text-[var(--color-muted-foreground)]">
              <Clock3 className="mb-3 size-7 opacity-55" />
              <p className="text-sm leading-6 text-[var(--color-foreground)]">
                {t("noVersionHistory")}
              </p>
              <p className="mt-1 text-xs leading-5">
                {t("noVersionHistoryDescription")}
              </p>
            </div>
          )}
        </div>
        <PaginationControls
          currentPage={currentPage}
          locale={locale}
          nextLabel={t("next")}
          onNext={() => changePage(currentPage + 1)}
          onPrevious={() => changePage(currentPage - 1)}
          previousLabel={t("previous")}
          totalItems={versions.length}
          totalPages={totalPages}
        />

        <div className="shrink-0 flex justify-end border-t border-[var(--color-border)] px-5 py-3.5">
          <button
            className="bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canRestore || !selectedVersion || selectedVersionIsCurrent}
            onClick={() => {
              if (selectedVersion && !selectedVersionIsCurrent) {
                onRestore(selectedVersion);
              }
            }}
            type="button"
          >
            {t("restore")}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function getSelectedDocumentVersion(
  document: DocumentRecord,
  selectedVersionId: string | null,
) {
  return (document.versionHistory ?? []).find((version) => version.id === selectedVersionId) ?? null;
}

function getUserName(users: User[], userId: string) {
  return users.find((user) => user.id === userId)?.name ?? null;
}

function formatVersionTime(value: string, locale: "zh" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return locale === "zh" ? "未知时间" : "Unknown time";
  }

  const now = new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (dateOnly.getTime() === today.getTime()) {
    return locale === "zh" ? `今天 · ${time}` : `Today · ${time}`;
  }

  if (dateOnly.getTime() === yesterday.getTime()) {
    return locale === "zh" ? `昨天 · ${time}` : `Yesterday · ${time}`;
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}
