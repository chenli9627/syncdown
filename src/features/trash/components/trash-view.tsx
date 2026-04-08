"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DocumentRecord } from "@/features/app-state/types";
import { useAppState } from "@/features/app-state/providers/app-state-provider";

function formatDeletedAt(value: string | null | undefined) {
  if (!value) {
    return "Deleted time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TrashView() {
  const router = useRouter();
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

  const trashItems = buckets?.trash ?? [];

  return (
    <div className="relative flex min-h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_22%,transparent_42%)] p-8 md:p-10">
      <div className="max-w-4xl space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
          Trash
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)]">
          Restore documents to their previous status or permanently delete them.
        </p>
      </div>

      {notice ? (
        <p className="mt-6 text-sm text-[var(--color-muted-foreground)]">{notice}</p>
      ) : null}
      {error ? <p className="mt-6 text-sm text-[#dd5b00]">{error}</p> : null}

      {trashItems.length ? (
        <div className="mt-8 max-h-[min(60vh,720px)] max-w-4xl overflow-y-auto border border-[var(--color-border)] bg-[var(--color-card)]">
          {trashItems.map((document, index) => {
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
                    Deleted {formatDeletedAt(document.deletedAt)}
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
                        setError(result.error);
                        return;
                      }

                      setNotice("Document restored");
                    }}
                    type="button"
                  >
                    Restore
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
                    Delete permanently
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 max-w-4xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4 text-sm text-[var(--color-muted-foreground)]">
          No pages inside
        </div>
      )}

      {pendingDeleteDocument ? (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.18)] px-6">
          <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft-card)]">
            <p className="text-base leading-7 text-[var(--color-foreground)]">
              Permanently delete{" "}
              <span className="font-semibold">{pendingDeleteDocument.title}</span>?
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                onClick={() => {
                  setPendingDeleteDocument(null);
                }}
                type="button"
              >
                Cancel
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
                    setError(result.error);
                    return;
                  }

                  setPendingDeleteDocument(null);
                  setNotice("Document permanently deleted");
                }}
                type="button"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
