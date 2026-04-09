"use client";

import Image from "next/image";
import { useLocale } from "@/components/providers/locale-provider";
import type { PresenceParticipant } from "@/features/editor/lib/types";

type EditorHeaderPresenceProps = {
  participants: PresenceParticipant[];
};

export function EditorHeaderPresence({
  participants,
}: EditorHeaderPresenceProps) {
  const { t } = useLocale();
  const safeParticipants = participants ?? [];

  if (safeParticipants.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1.5"
      title={safeParticipants.map((entry) => entry.name).join(", ")}
    >
      <div className="flex items-center -space-x-1.5">
        {safeParticipants.slice(0, 3).map((entry) => (
          entry.avatarUrl ? (
            <Image
              alt={entry.name}
              className="size-6 rounded-full object-cover"
              key={entry.userId}
              src={entry.avatarUrl}
              title={entry.name}
              unoptimized
              width={24}
              height={24}
            />
          ) : (
            <span
              className="flex size-6 items-center justify-center rounded-full bg-[var(--color-sidebar-panel)] text-[10px] font-semibold text-[var(--color-foreground)]"
              key={entry.userId}
              title={entry.name}
            >
              {(entry.name || t("unknownUser")).slice(0, 1).toUpperCase()}
            </span>
          )
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
