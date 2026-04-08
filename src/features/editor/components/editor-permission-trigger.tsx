"use client";

import { ChevronDown, Lock } from "lucide-react";

type EditorPermissionTriggerProps = {
  documentStatus: "private" | "shared" | "trashed";
  onClick: () => void;
  permissionButtonRef: React.RefObject<HTMLButtonElement | null>;
  permissionMenuOpen: boolean;
  sharedAvatars: Array<{ id: string; name: string }>;
};

export function EditorPermissionTrigger({
  documentStatus,
  onClick,
  permissionButtonRef,
  permissionMenuOpen,
  sharedAvatars,
}: EditorPermissionTriggerProps) {
  return (
    <button
      className="flex min-h-10 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
      onClick={onClick}
      ref={permissionButtonRef}
      type="button"
    >
      {documentStatus === "private" ? (
        <>
          <Lock className="size-4 text-[var(--color-muted-foreground)]" />
          <span>Private</span>
        </>
      ) : (
        <>
          <span>Shared</span>
          <div className="flex items-center -space-x-1">
            {sharedAvatars.map((entry) => (
              <span
                className="flex size-6 items-center justify-center rounded-full border border-white bg-[var(--color-sidebar-panel)] text-[11px] font-semibold text-[var(--color-muted-foreground)]"
                key={entry.id}
                title={entry.name}
              >
                {entry.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        </>
      )}
      <ChevronDown
        className={`size-4 text-[var(--color-muted-foreground)] transition ${
          permissionMenuOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
