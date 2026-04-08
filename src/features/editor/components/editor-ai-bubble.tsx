"use client";

import { Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import type { AiActionKind } from "@/features/editor/lib/ai";
import type { AiBubbleState } from "@/features/editor/lib/types";

type EditorAiBubbleProps = {
  aiBubble: AiBubbleState;
  aiBubbleRef: RefObject<HTMLDivElement | null>;
  onApply: () => void;
  onClose: () => void;
  onInsertBelow: () => void;
  onPreviewAction: (action: AiActionKind) => void;
  onPromptChange: (value: string) => void;
};

export function EditorAiBubble({
  aiBubble,
  aiBubbleRef,
  onApply,
  onClose,
  onInsertBelow,
  onPreviewAction,
  onPromptChange,
}: EditorAiBubbleProps) {
  const { t } = useLocale();

  if (!aiBubble.open || !globalThis.document?.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[93] w-[320px] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
      ref={aiBubbleRef}
      style={{
        left: `${aiBubble.left}px`,
        top: `${aiBubble.top}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
        <Sparkles className="size-4 text-[var(--color-primary)]" />
        <span>{t("aiPreview")}</span>
      </div>
      {aiBubble.action ? (
        <AiResultView
          aiBubble={aiBubble}
          onApply={onApply}
          onClose={onClose}
          onInsertBelow={onInsertBelow}
        />
      ) : (
        <AiActionMenu
          prompt={aiBubble.prompt}
          onClose={onClose}
          onPreviewAction={onPreviewAction}
          onPromptChange={onPromptChange}
        />
      )}
    </div>,
    globalThis.document.body,
  );
}

type AiActionMenuProps = {
  onClose: () => void;
  onPreviewAction: (action: AiActionKind) => void;
  onPromptChange: (value: string) => void;
  prompt: string;
};

function AiActionMenu({
  onClose,
  onPreviewAction,
  onPromptChange,
  prompt,
}: AiActionMenuProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <AiActionButton label={t("improveWriting")} onClick={() => onPreviewAction("improve_writing")} />
        <AiActionButton label={t("explain")} onClick={() => onPreviewAction("explain")} />
        <AiActionButton label={t("reformat")} onClick={() => onPreviewAction("reformat")} />
        <AiActionButton label={t("summarize")} onClick={() => onPreviewAction("summarize")} />
      </div>
      <div className="space-y-2">
        <textarea
          className="h-24 w-full resize-none border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-ring)]"
          onChange={(event) => {
            onPromptChange(event.target.value);
          }}
          placeholder={t("customPromptPlaceholder")}
          value={prompt}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            className="border border-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
            onClick={onClose}
            type="button"
          >
            {t("discard")}
          </button>
          <button
            className="bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95"
            onClick={() => onPreviewAction("custom")}
            type="button"
          >
            {t("generate")}
          </button>
        </div>
      </div>
    </div>
  );
}

type AiResultViewProps = {
  aiBubble: AiBubbleState;
  onApply: () => void;
  onClose: () => void;
  onInsertBelow: () => void;
};

function AiResultView({ aiBubble, onApply, onClose, onInsertBelow }: AiResultViewProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 py-2 text-sm leading-6 text-[var(--color-foreground)] whitespace-pre-wrap">
        {aiBubble.result}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          className="border border-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
          onClick={onClose}
          type="button"
        >
          {t("discard")}
        </button>
        {aiBubble.viewOnly ? null : (
          <div className="flex items-center gap-2">
            <button
              className="border border-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
              onClick={onInsertBelow}
              type="button"
            >
              {t("insertBelow")}
            </button>
            <button
              className="bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95"
              onClick={onApply}
              type="button"
            >
              {t("apply")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type AiActionButtonProps = {
  label: string;
  onClick: () => void;
};

function AiActionButton({ label, onClick }: AiActionButtonProps) {
  return (
    <button
      className="border border-[var(--color-border)] px-3 py-2 text-left text-sm transition hover:bg-[var(--color-hover)]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
