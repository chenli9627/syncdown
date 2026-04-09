"use client";

import Image from "next/image";
import { ChevronDown, Lock } from "lucide-react";

type EditorPermissionTriggerProps = {
  documentStatus: "private" | "shared" | "trashed";
  onClick: () => void;
  permissionButtonRef: React.RefObject<HTMLButtonElement | null>;
  permissionMenuOpen: boolean;
  sharedAvatars: Array<{ avatarUrl?: string | null; id: string; name: string }>;
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
      className="flex min-h-9 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-[12px] shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-hover)]"
      onClick={onClick}
      ref={permissionButtonRef}
      type="button"
    >
      {documentStatus === "private" ? (
        <>
          <Lock className="size-3.5 text-[var(--color-muted-foreground)]" />
          <span>Private</span>
        </>
      ) : (
        <>
          <span>Shared</span>
          <div className="flex items-center -space-x-1">
            {sharedAvatars.map((entry) => (
              entry.avatarUrl ? (
                <Image
                  alt={entry.name}
                  className="size-5 rounded-full border border-white object-cover"
                  key={entry.id}
                  src={entry.avatarUrl}
                  title={entry.name}
                  unoptimized
                  width={20}
                  height={20}
                />
              ) : (
                <span
                  className="flex size-5 items-center justify-center rounded-full border border-white bg-[var(--color-sidebar-panel)] text-[10px] font-semibold text-[var(--color-muted-foreground)]"
                  key={entry.id}
                  title={entry.name}
                >
                  {entry.name.slice(0, 1).toUpperCase()}
                </span>
              )
            ))}
          </div>
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
