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
  onSelectCandidate: (index: number) => void;
};

export function EditorAiBubble({
  aiBubble,
  aiBubbleRef,
  onApply,
  onClose,
  onInsertBelow,
  onPreviewAction,
  onPromptChange,
  onSelectCandidate,
}: EditorAiBubbleProps) {
  const { t } = useLocale();
  const bubbleWidthClass =
    aiBubble.action && aiBubble.candidates.length > 1
      ? "w-[min(560px,calc(100vw-32px))]"
      : "w-[304px] max-w-[calc(100vw-32px)]";

  if (!aiBubble.open || !globalThis.document?.body) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed z-[93] flex max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[var(--shadow-soft-card)] ${bubbleWidthClass}`}
      ref={aiBubbleRef}
      style={{
        left: `${aiBubble.left}px`,
        top: `${aiBubble.top}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-foreground)]">
        <Sparkles className="size-3.5 text-[var(--color-primary)]" />
        <span>{t("aiPreview")}</span>
      </div>
      {aiBubble.action ? (
        <AiResultView
          aiBubble={aiBubble}
          onApply={onApply}
          onClose={onClose}
          onInsertBelow={onInsertBelow}
          onSelectCandidate={onSelectCandidate}
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
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <div className="grid grid-cols-2 gap-1.5">
        <AiActionButton label={t("improveWriting")} onClick={() => onPreviewAction("improve_writing")} />
        <AiActionButton label={t("explain")} onClick={() => onPreviewAction("explain")} />
        <AiActionButton label={t("reformat")} onClick={() => onPreviewAction("reformat")} />
        <AiActionButton label={t("summarize")} onClick={() => onPreviewAction("summarize")} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <textarea
          className="min-h-24 w-full flex-1 resize-none border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-[12px] outline-none transition focus:border-[var(--color-ring)]"
          onChange={(event) => {
            onPromptChange(event.target.value);
          }}
          placeholder={t("customPromptPlaceholder")}
          value={prompt}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
            onMouseDown={preventBubbleBlur}
            onClick={onClose}
            type="button"
          >
            {t("discard")}
          </button>
          <button
            className="bg-[var(--color-primary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95"
            onMouseDown={preventBubbleBlur}
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
  onSelectCandidate: (index: number) => void;
};

function AiResultView({
  aiBubble,
  onApply,
  onClose,
  onInsertBelow,
  onSelectCandidate,
}: AiResultViewProps) {
  const { t } = useLocale();
  const selectedCandidate = aiBubble.candidates[aiBubble.selectedCandidateIndex] ?? null;
  const showSideBySide = aiBubble.candidates.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <div
        className={`min-h-0 flex-1 overflow-hidden ${
          showSideBySide ? "grid grid-cols-1 gap-2 md:grid-cols-2" : ""
        }`}
      >
        {showSideBySide
          ? aiBubble.candidates.map((candidate, index) => (
              <div
                className={`flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden border px-2.5 py-2 transition ${
                  index === aiBubble.selectedCandidateIndex
                    ? "border-[var(--color-primary)] bg-[rgba(35,131,226,0.08)]"
                    : "border-[var(--color-border)] bg-[var(--color-sidebar-panel)]"
                }`}
                key={candidate.model}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`min-w-0 truncate text-[11px] font-medium ${
                      index === aiBubble.selectedCandidateIndex
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                    title={candidate.model}
                  >
                    {candidate.model}
                  </div>
                  <button
                    className={`shrink-0 border px-2 py-1 text-[11px] transition ${
                      index === aiBubble.selectedCandidateIndex
                        ? "border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
                    }`}
                    onMouseDown={preventBubbleBlur}
                    onClick={() => onSelectCandidate(index)}
                    type="button"
                  >
                    {index === aiBubble.selectedCandidateIndex
                      ? t("aiSelectedCandidate")
                      : t("aiChooseCandidate")}
                  </button>
                </div>
                <AiCandidateContent
                  candidate={candidate}
                  error={aiBubble.error}
                  loading={aiBubble.loading}
                  scrollClassName="min-h-0 flex-1 overflow-y-auto pr-1 select-text"
                />
              </div>
            ))
          : (
              <div className="min-h-0 flex-1 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-2.5 py-2 text-[12px] leading-5 text-[var(--color-foreground)] whitespace-pre-wrap">
                <AiCandidateContent
                  candidate={selectedCandidate}
                  error={aiBubble.error}
                  loading={aiBubble.loading}
                  scrollClassName="select-text"
                />
              </div>
            )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
          onMouseDown={preventBubbleBlur}
          onClick={onClose}
          type="button"
        >
          {t("discard")}
        </button>
        {aiBubble.viewOnly || aiBubble.loading || aiBubble.error ? null : (
          <div className="flex items-center gap-2">
            <button
              className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
              onMouseDown={preventBubbleBlur}
              onClick={onInsertBelow}
              type="button"
            >
              {t("insertBelow")}
            </button>
            <button
              className="bg-[var(--color-primary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95"
              onMouseDown={preventBubbleBlur}
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

function AiCandidateContent({
  candidate,
  error,
  loading,
  scrollClassName,
}: {
  candidate:
    | {
        result: string;
        resultHtml: string;
      }
    | null;
  error: string | null;
  loading: boolean;
  scrollClassName: string;
}) {
  const { t } = useLocale();

  if (loading) {
    return <div className="text-[12px] leading-5 text-[var(--color-foreground)]">{t("aiGenerating")}</div>;
  }

  if (error) {
    return <div className="text-[12px] leading-5 text-[var(--color-foreground)]">{t("aiGenerationFailed")}</div>;
  }

  if (candidate?.resultHtml) {
    return (
      <div
        className={`syntext-editor min-h-0 text-[12px] leading-5 ${scrollClassName}`.trim()}
        dangerouslySetInnerHTML={{ __html: candidate.resultHtml }}
      />
    );
  }

  return (
    <div
      className={`text-[12px] leading-5 text-[var(--color-foreground)] whitespace-pre-wrap ${scrollClassName}`.trim()}
    >
      {candidate?.result ?? ""}
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
      className="border border-[var(--color-border)] px-2.5 py-1.5 text-left text-[12px] transition hover:bg-[var(--color-hover)]"
      onMouseDown={preventBubbleBlur}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function preventBubbleBlur(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}
