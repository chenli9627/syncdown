"use client";

import { Check, ChevronDown, MessageSquarePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatThread } from "@/features/app-state/types";
import { cn } from "@/lib/utils";

type EditorAiChatThreadSwitcherProps = {
  activeThreadId: string | null;
  onDeleteThread: (threadId: string) => void;
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
  threads: AiChatThread[];
};

export function EditorAiChatThreadSwitcher({
  activeThreadId,
  onDeleteThread,
  onNewThread,
  onSelectThread,
  threads,
}: EditorAiChatThreadSwitcherProps) {
  const { t } = useLocale();
  const [confirmingThreadId, setConfirmingThreadId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const activeLabel = activeThread
    ? getThreadLabel(activeThread, t("aiUntitledChat"))
    : t("aiUntitledChat");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative min-w-0" ref={switcherRef}>
      <button
        aria-expanded={open}
        className="flex h-8 max-w-44 min-w-0 items-center gap-1.5 border border-transparent px-1 text-left text-xs font-normal text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
        onClick={() => setOpen((current) => !current)}
        title={activeLabel}
        type="button"
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("shrink-0 transition-transform", open ? "rotate-180" : "")}
          size={14}
        />
      </button>
      {open ? (
        <div
          aria-label={t("aiChatSessions")}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
          role="menu"
        >
          <button
            className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
            onClick={() => {
              setOpen(false);
              onNewThread();
            }}
            role="menuitem"
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" size={13} />
            <span>{t("aiNewChat")}</span>
          </button>
          {threads.length ? (
            <div className="my-1 border-t border-[var(--color-border)]" />
          ) : null}
          {threads.map((thread) => {
            const label = getThreadLabel(thread, t("aiUntitledChat"));
            const confirming = confirmingThreadId === thread.id;

            return (
              <div className="group flex h-8 items-center hover:bg-[var(--color-muted)]" key={thread.id}>
                {confirming ? (
                  <div className="flex w-full items-center gap-1 px-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-[var(--color-foreground)]">
                      {t("aiConfirmDeleteChat")}
                    </span>
                    <button
                      className="h-6 border border-[var(--color-border)] px-1.5 text-[11px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)]"
                      onClick={() => setConfirmingThreadId(null)}
                      type="button"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="h-6 border border-[#c43a31] bg-[#c43a31] px-1.5 text-[11px] text-white hover:brightness-95"
                      onClick={() => {
                        setConfirmingThreadId(null);
                        onDeleteThread(thread.id);
                      }}
                      type="button"
                    >
                      {t("delete")}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-left text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      onClick={() => {
                        setOpen(false);
                        onSelectThread(thread.id);
                      }}
                      role="menuitem"
                      title={label}
                      type="button"
                    >
                      <span className="w-3 shrink-0">
                        {thread.id === activeThreadId ? (
                          <Check aria-hidden="true" size={12} />
                        ) : null}
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                    <button
                      className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[#c43a31] group-hover:flex"
                      onClick={() => setConfirmingThreadId(thread.id)}
                      title={t("delete")}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={12} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
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
