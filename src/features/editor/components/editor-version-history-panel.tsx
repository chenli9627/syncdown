"use client";

import { CircleHelp, X } from "lucide-react";
import type { DocumentRecord, DocumentVersion, User } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";

type VersionHistoryEntry = {
  content: string;
  createdAt: string;
  id: string;
  title: string;
  userId: string;
};

type EditorVersionHistoryPanelProps = {
  canRestore: boolean;
  document: DocumentRecord;
  onClose: () => void;
  onRestore: (version: DocumentVersion) => void;
  onSelectVersion: (versionId: string) => void;
  selectedVersionId: string | null;
  users: User[];
};

const CURRENT_VERSION_ID = "current";

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
  const versions = document.versionHistory ?? [];
  const entries: VersionHistoryEntry[] = [
    {
      content: document.content,
      createdAt: document.lastEditedAt,
      id: CURRENT_VERSION_ID,
      title: document.title,
      userId: document.ownerUserId,
    },
    ...versions,
  ];
  const activeVersionId = selectedVersionId ?? entries[0]?.id ?? CURRENT_VERSION_ID;
  const selectedVersion =
    versions.find((version) => version.id === activeVersionId) ?? null;

  return (
    <aside className="fixed bottom-3 right-3 top-3 z-[45] flex max-h-[calc(100dvh-1.5rem)] w-[min(384px,calc(100vw-1.5rem))] flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]">
      <div className="shrink-0 flex items-center justify-between px-6 py-5">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
          {t("versionHistory")}
        </h2>
        <button
          aria-label={t("close")}
          className="flex size-8 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {entries.map((entry) => {
          const active = entry.id === activeVersionId;

          return (
            <button
              className={`block w-full px-5 py-2.5 text-left transition ${
                active
                  ? "bg-[var(--color-hover)]"
                  : "hover:bg-[color-mix(in_srgb,var(--color-hover)_65%,transparent)]"
              }`}
              key={entry.id}
              onClick={() => onSelectVersion(entry.id)}
              type="button"
            >
              <span className="block text-[20px] leading-7 tracking-[-0.01em] text-[var(--color-foreground)]">
                {formatVersionTime(entry.createdAt, locale)}
              </span>
              <span className="mt-0.5 block text-[16px] leading-6 text-[var(--color-muted-foreground)]">
                {getUserName(users, entry.userId) ?? t("unknownUser")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 flex items-center gap-3 border-t border-[var(--color-border)] px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[16px] text-[var(--color-muted-foreground)]">
          <CircleHelp className="size-4 shrink-0" />
          <span>{t("learnMore")}</span>
        </div>
        <button
          className="bg-[var(--color-primary)] px-4 py-2 text-[16px] font-medium text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canRestore || !selectedVersion}
          onClick={() => {
            if (selectedVersion) {
              onRestore(selectedVersion);
            }
          }}
          type="button"
        >
          {t("restore")}
        </button>
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
