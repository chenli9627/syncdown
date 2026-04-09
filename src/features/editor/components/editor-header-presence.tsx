"use client";

import type { PresenceParticipant } from "@/features/editor/lib/types";

type EditorHeaderPresenceProps = {
  participants: PresenceParticipant[];
};

export function EditorHeaderPresence({
  participants,
}: EditorHeaderPresenceProps) {
  const safeParticipants = participants ?? [];

  if (safeParticipants.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 shadow-[var(--shadow-whisper)]"
      title={safeParticipants.map((entry) => entry.name).join(", ")}
    >
      <div className="flex items-center gap-1">
        {safeParticipants.slice(0, 3).map((entry) => (
          <span
            className="border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-foreground)]"
            key={entry.userId}
            title={entry.name}
          >
            {entry.name || "Unknown"}
          </span>
        ))}
      </div>
      {safeParticipants.length > 3 ? (
        <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
          +{safeParticipants.length - 3}
        </span>
      ) : null}
    </div>
  );
}
