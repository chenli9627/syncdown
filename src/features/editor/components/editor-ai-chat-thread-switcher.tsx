"use client";

import { MessageSquarePlus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatThread } from "@/features/app-state/types";

type EditorAiChatThreadSwitcherProps = {
  activeThreadId: string | null;
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
  threads: AiChatThread[];
};

export function EditorAiChatThreadSwitcher({
  activeThreadId,
  onNewThread,
  onSelectThread,
  threads,
}: EditorAiChatThreadSwitcherProps) {
  const { t } = useLocale();

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
      <button
        className="inline-flex h-7 shrink-0 items-center gap-1 border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
        onClick={onNewThread}
        title={t("aiNewChat")}
        type="button"
      >
        <MessageSquarePlus aria-hidden="true" size={13} />
        {t("aiNewChat")}
      </button>
      <div
        aria-label={t("aiChatSessions")}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
      >
        {threads.map((thread) => (
          <button
            className={
              thread.id === activeThreadId
                ? "h-7 max-w-28 shrink-0 border border-[var(--color-primary)] bg-[var(--color-primary)] px-2 text-xs text-[var(--color-primary-foreground)]"
                : "h-7 max-w-28 shrink-0 border border-[var(--color-border)] bg-transparent px-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            title={getThreadLabel(thread, t("aiUntitledChat"))}
            type="button"
          >
            <span className="block truncate">{getThreadLabel(thread, t("aiUntitledChat"))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getThreadLabel(thread: AiChatThread, fallback: string) {
  const firstUserMessage = thread.messages.find((message) => message.role === "user");
  const text =
    firstUserMessage?.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim() ?? "";

  return text || fallback;
}
