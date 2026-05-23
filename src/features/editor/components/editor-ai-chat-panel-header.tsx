"use client";

import { Bot, PanelRightClose } from "lucide-react";
import type { PointerEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiChatModelKey } from "@/features/app-state/types";
import { EditorAiModelSelect } from "@/features/editor/components/editor-ai-model-select";

type AiModelOption = {
  key: AiChatModelKey;
  name: string;
};

type EditorAiChatPanelHeaderProps = {
  activeModelName: string;
  isNarrow: boolean;
  modelKey: AiChatModelKey;
  models: AiModelOption[];
  onClose: () => void;
  onModelChange: (value: AiChatModelKey) => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
};

export function EditorAiChatPanelHeader({
  activeModelName,
  isNarrow,
  modelKey,
  models,
  onClose,
  onModelChange,
  onResizeStart,
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
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <Bot aria-hidden="true" size={16} />
            {t("aiChatTitle")}
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
            {t("aiModel")}: {activeModelName}
          </p>
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
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <label className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
          {t("aiModel")}
        </label>
        <EditorAiModelSelect models={models} onChange={onModelChange} value={modelKey} />
      </div>
    </>
  );
}
