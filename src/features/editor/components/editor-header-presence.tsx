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
      <div className="flex items-center -space-x-1">
        {safeParticipants.slice(0, 4).map((entry) => (
          <span
            className="relative flex size-5 items-center justify-center border border-white text-[10px] font-semibold text-white"
            key={entry.userId}
            style={{ backgroundColor: entry.color }}
            title={entry.name}
          >
            {(entry.name || "?").slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      {safeParticipants.length > 4 ? (
        <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
          +{safeParticipants.length - 4}
        </span>
      ) : null}
    </div>
  );
}
