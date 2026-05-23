"use client";

import { PanelRightClose } from "lucide-react";
import type { PointerEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatModelKey, AiChatThread } from "@/features/app-state/types";
import { EditorAiModelSelect } from "@/features/editor/components/editor-ai-model-select";
import { EditorAiChatThreadSwitcher } from "@/features/editor/components/editor-ai-chat-thread-switcher";

type AiModelOption = {
  key: AiChatModelKey;
  name: string;
};

type EditorAiChatPanelHeaderProps = {
  activeThreadId: string | null;
  isNarrow: boolean;
  modelKey: AiChatModelKey;
  models: AiModelOption[];
  onClose: () => void;
  onDeleteThread: (threadId: string) => void;
  onModelChange: (value: AiChatModelKey) => void;
  onNewThread: () => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
  onSelectThread: (threadId: string) => void;
  threads: AiChatThread[];
};

export function EditorAiChatPanelHeader({
  activeThreadId,
  isNarrow,
  modelKey,
  models,
  onClose,
  onDeleteThread,
  onModelChange,
  onNewThread,
  onResizeStart,
  onSelectThread,
  threads,
}: EditorAiChatPanelHeaderProps) {
  const { t } = useLocale();

  return (
    <>
      {!isNarrow ? (
        <div
          className="absolute bottom-0 left-0 top-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]"
          onPointerDown={onResizeStart}
        />
      ) : null}
      <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <EditorAiChatThreadSwitcher
            activeThreadId={activeThreadId}
            onDeleteThread={onDeleteThread}
            onNewThread={onNewThread}
            onSelectThread={onSelectThread}
            threads={threads}
          />
          <EditorAiModelSelect
            className="w-36 flex-none sm:w-40"
            models={models}
            onChange={onModelChange}
            value={modelKey}
          />
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          onClick={onClose}
          title={t("closeAiChat")}
          type="button"
        >
          <PanelRightClose aria-hidden="true" size={16} />
        </button>
      </div>
    </>
  );
}
