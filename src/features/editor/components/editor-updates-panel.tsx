"use client";

import { Activity, X } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { DocumentRecord, User } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getDocumentUpdateEntries,
  getDocumentUpdateParts,
  type DocumentUpdateEntry,
  type DocumentUpdateLabels,
  type DocumentUpdatePart,
} from "@/features/editor/lib/document-updates";
import { usePaginatedItems } from "@/features/editor/hooks/use-paginated-items";

type EditorUpdatesPanelProps = {
  document: DocumentRecord;
  onClose: () => void;
  users: User[];
};

export function EditorUpdatesPanel({
  document,
  onClose,
  users,
}: EditorUpdatesPanelProps) {
  const { locale, t } = useLocale();
  const updateLabels = {
    imageSingle: `[${t("versionImagePlaceholder")}]`,
    tableOfContents: t("tableOfContents"),
    title: t("updateDocumentTitle"),
  };
  const updates = getDocumentUpdateEntries(document);
  const { currentPage, paginatedItems, setCurrentPage, totalPages } =
    usePaginatedItems(updates, 10);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[44] bg-transparent"
        onMouseDown={onClose}
      />
      <aside className="fixed bottom-4 right-4 top-4 z-[45] flex w-[min(460px,calc(100vw-32px))] min-h-0 flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">
              {t("updates")}
            </h2>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-muted-foreground)]">
              {t("updatesDescription")}
            </p>
          </div>
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
          {updates.length > 0 ? (
            <div className="space-y-2">
              {paginatedItems.map((entry) => (
                <UpdateEntryCard
                  entry={entry}
                  key={entry.id}
                  labels={updateLabels}
                  locale={locale}
                  users={users}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center text-[var(--color-muted-foreground)]">
              <Activity className="mb-3 size-7 opacity-55" />
              <p className="text-[13px] leading-6 text-[var(--color-foreground)]">
                {t("noUpdates")}
              </p>
              <p className="mt-1 text-[12px] leading-5">
                {t("noUpdatesDescription")}
              </p>
            </div>
          )}
        </div>
        <PaginationControls
          currentPage={currentPage}
          locale={locale}
          nextLabel={t("next")}
          onNext={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
          onPrevious={() => setCurrentPage((current) => Math.max(1, current - 1))}
          previousLabel={t("previous")}
          totalItems={updates.length}
          totalPages={totalPages}
        />
      </aside>
    </>
  );
}

function UpdateEntryCard({
  entry,
  labels,
  locale,
  users,
}: {
  entry: DocumentUpdateEntry;
  labels: DocumentUpdateLabels;
  locale: "zh" | "en";
  users: User[];
}) {
  const { t } = useLocale();
  const parts = getDocumentUpdateParts(entry, labels);

  return (
    <article className="border border-transparent px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--color-hover)_55%,transparent)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium leading-5 text-[var(--color-foreground)]">
          {getUserName(users, entry.userId) ?? t("unknownUser")}
        </p>
        <time className="shrink-0 text-[11px] leading-5 text-[var(--color-muted-foreground)]">
          {formatUpdateTime(entry.createdAt, locale)}
        </time>
      </div>
      {parts.length > 0 ? (
        <div className="mt-2 space-y-1.5 text-[12px] leading-5">
          {parts.map((part, index) => (
            <UpdatePartLine
              key={`${entry.id}-${index}`}
              part={part}
              prefix={part.type === "added" ? t("updateAdded") : t("updateRemoved")}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12px] leading-5 text-[var(--color-muted-foreground)]">
          {t("updateNoVisibleTextChange")}
        </p>
      )}
    </article>
  );
}

function UpdatePartLine({
  part,
  prefix,
}: {
  part: DocumentUpdatePart;
  prefix: string;
}) {
  const removed = part.type === "removed";

  return (
    <p className="flex gap-2">
      <span className="shrink-0 text-[var(--color-muted-foreground)]">{prefix}</span>
      <span
        className={`min-w-0 whitespace-pre-wrap break-words ${
          removed
            ? "text-[var(--color-muted-foreground)] line-through"
            : "text-[var(--color-primary)]"
        }`}
      >
        {part.text.trim()}
      </span>
    </p>
  );
}

function getUserName(users: User[], userId: string) {
  return users.find((user) => user.id === userId)?.name ?? null;
}

function formatUpdateTime(value: string, locale: "zh" | "en") {
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
