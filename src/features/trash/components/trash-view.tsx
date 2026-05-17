"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { AppErrorDialog } from "@/components/ui/app-error-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { DocumentRecord } from "@/features/app-state/types";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { usePaginatedItems } from "@/features/editor/hooks/use-paginated-items";
import { translateAppError } from "@/lib/i18n/error-messages";

function formatDeletedAt(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TrashView() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const {
    buckets,
    currentUser,
    currentWorkspace,
    permanentlyDeleteDocument,
    ready,
    restoreDocumentFromTrash,
  } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingDocumentId, setWorkingDocumentId] = useState<string | null>(null);
  const [pendingDeleteDocument, setPendingDeleteDocument] =
    useState<DocumentRecord | null>(null);

  const canManageCurrentWorkspace =
    currentUser && currentWorkspace
      ? currentWorkspace.ownerUserId === currentUser.id
      : false;
  const trashItems = buckets?.trash ?? [];
  const { currentPage, paginatedItems, setCurrentPage, totalPages } =
    usePaginatedItems(trashItems, 10);

  useEffect(() => {
    if (!ready || !currentUser || !currentWorkspace) {
      return;
    }

    if (!canManageCurrentWorkspace) {
      router.replace("/home");
    }
  }, [canManageCurrentWorkspace, currentUser, currentWorkspace, ready, router]);

  if (!ready || !currentUser || !currentWorkspace || !canManageCurrentWorkspace) {
    return null;
  }

  return (
    <div
      className="relative flex min-h-full flex-col p-8 md:p-10"
      style={{ background: "var(--color-page-gradient)" }}
    >
      <div className="max-w-4xl space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
          {t("trash")}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)]">
          {t("trashDescription")}
        </p>
      </div>

      {notice ? (
        <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">{notice}</p>
      ) : null}

      {trashItems.length ? (
        <div className="mt-8 max-w-4xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="max-h-[min(60vh,720px)] overflow-y-auto">
          {paginatedItems.map((document, index) => {
            const isWorking = workingDocumentId === document.id;

            return (
              <div
                className="flex items-center gap-4 px-4 py-3 text-sm"
                key={document.id}
                style={{
                  borderTop:
                    index === 0 ? "none" : "1px solid var(--color-border)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{document.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                    {t("deletedAtPrefix")}{" "}
                    {formatDeletedAt(document.deletedAt, locale, t("deletedTimeUnavailable"))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isWorking}
                    onClick={async () => {
                      setError(null);
                      setNotice(null);
                      setWorkingDocumentId(document.id);
                      const result = await restoreDocumentFromTrash(document.id);
                      setWorkingDocumentId(null);

                      if (!result.ok) {
                        setError(translateAppError(result.error, t, locale));
                        return;
                      }

                      setNotice(t("documentRestored"));
                    }}
                    type="button"
                  >
                    {t("restore")}
                  </button>
                  <button
                    className="border border-[#c93c37] px-3 py-1.5 text-[13px] text-[#c93c37] transition hover:bg-[#fff1f0] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isWorking}
                    onClick={() => {
                      setPendingDeleteDocument(document);
                      setError(null);
                      setNotice(null);
                    }}
                    type="button"
                  >
                    {t("deletePermanently")}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
          <PaginationControls
            currentPage={currentPage}
            locale={locale}
            nextLabel={t("next")}
            onNext={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            onPageSelect={(page) => setCurrentPage(page)}
            onPrevious={() => setCurrentPage((current) => Math.max(1, current - 1))}
            previousLabel={t("previous")}
            totalItems={trashItems.length}
            totalPages={totalPages}
          />
        </div>
      ) : (
        <div className="mt-8 max-w-4xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
          {t("noPagesInside")}
        </div>
      )}

      {pendingDeleteDocument ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.18)] px-6">
          <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft-card)]">
            <p className="text-base leading-7 text-[var(--color-foreground)]">
              {t("permanentDeletePrompt")}{" "}
              <span className="font-semibold">{pendingDeleteDocument.title}</span>?
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              {t("permanentDeleteDescription")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                onClick={() => {
                  setPendingDeleteDocument(null);
                }}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="border border-[#c93c37] bg-[#c93c37] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={workingDocumentId === pendingDeleteDocument.id}
                onClick={async () => {
                  setError(null);
                  setNotice(null);
                  setWorkingDocumentId(pendingDeleteDocument.id);
                  const result = await permanentlyDeleteDocument(
                    pendingDeleteDocument.id,
                  );
                  setWorkingDocumentId(null);

                  if (!result.ok) {
                    setError(translateAppError(result.error, t, locale));
                    return;
                  }

                  setPendingDeleteDocument(null);
                  setNotice(t("documentPermanentlyDeleted"));
                }}
                type="button"
              >
                {t("deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AppErrorDialog error={error} onClose={() => setError(null)} title={t("deleteFailed")} />
    </div>
  );
}
