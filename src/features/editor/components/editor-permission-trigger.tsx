"use client";

import { ChevronDown, Lock, LockOpen } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

type EditorPermissionTriggerProps = {
  documentStatus: "private" | "shared" | "trashed";
  onClick: () => void;
  permissionButtonRef: React.RefObject<HTMLButtonElement | null>;
  permissionMenuOpen: boolean;
};

export function EditorPermissionTrigger({
  documentStatus,
  onClick,
  permissionButtonRef,
  permissionMenuOpen,
}: EditorPermissionTriggerProps) {
  const { t } = useLocale();
  return (
    <button
      className="flex min-h-9 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
      onClick={onClick}
      ref={permissionButtonRef}
      type="button"
    >
      {documentStatus === "private" ? (
        <>
          <Lock className="size-3.5 text-[var(--color-muted-foreground)]" />
          <span>{t("private")}</span>
        </>
      ) : (
        <>
          <LockOpen className="size-3.5 text-[var(--color-muted-foreground)]" />
          <span>{t("shared")}</span>
        </>
      )}
      <ChevronDown
        className={`size-3.5 text-[var(--color-muted-foreground)] transition ${
          permissionMenuOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
