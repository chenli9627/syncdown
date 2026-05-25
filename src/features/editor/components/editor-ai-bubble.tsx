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
  onResultCountChange: (count: 1 | 2) => void;
  onSelectCandidate: (index: number) => void;
};

export function EditorAiBubble({
  aiBubble,
  aiBubbleRef,
  onApply,
  onClose,
  onInsertBelow,
  onPreviewAction,
  onResultCountChange,
  onSelectCandidate,
}: EditorAiBubbleProps) {
  const { t } = useLocale();
  const bubbleWidthClass =
    aiBubble.action && aiBubble.candidates.length > 1
      ? "w-[min(700px,calc(100vw-24px))]"
      : "w-[304px] max-w-[calc(100vw-32px)]";

  if (!aiBubble.open || !globalThis.document?.body) {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[92] bg-transparent"
        onMouseDown={preventBackdropInteraction}
        onTouchMove={preventBackdropInteraction}
        onWheel={preventBackdropInteraction}
      />
      <div
        className={`fixed z-[93] flex max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[var(--shadow-soft-card)] ${bubbleWidthClass}`}
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
            candidateCount={aiBubble.candidateCount}
            onClose={onClose}
            onPreviewAction={onPreviewAction}
            onResultCountChange={onResultCountChange}
          />
        )}
      </div>
    </>,
    globalThis.document.body,
  );
}

type AiActionMenuProps = {
  candidateCount: 1 | 2;
  onClose: () => void;
  onPreviewAction: (action: AiActionKind) => void;
  onResultCountChange: (count: 1 | 2) => void;
};

function AiActionMenu({
  candidateCount,
  onClose,
  onPreviewAction,
  onResultCountChange,
}: AiActionMenuProps) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <AiCompareResultsToggle
        checked={candidateCount === 2}
        label={t("aiCompareResults")}
        onChange={(checked) => onResultCountChange(checked ? 2 : 1)}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <AiActionButton label={t("translate")} onClick={() => onPreviewAction("translate")} />
        <AiActionButton label={t("summarize")} onClick={() => onPreviewAction("summarize")} />
        <AiActionButton label={t("explain")} onClick={() => onPreviewAction("explain")} />
        <AiActionButton label={t("improveWriting")} onClick={() => onPreviewAction("improve_writing")} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-2">
        <button
          className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
          onMouseDown={preventBubbleBlur}
          onClick={onClose}
          type="button"
        >
          {t("discard")}
        </button>
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
  const candidateScrollClass = showSideBySide
    ? "max-h-[min(34dvh,260px)] overflow-y-auto pr-1 select-text"
    : "max-h-[min(42dvh,340px)] overflow-y-auto pr-1 select-text";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <div className={showSideBySide ? "grid min-h-0 grid-cols-1 items-start gap-2 md:grid-cols-2" : "min-h-0"}>
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
                  scrollClassName={candidateScrollClass}
                />
              </div>
            ))
          : (
              <div className="flex min-h-0 flex-col gap-2 overflow-hidden border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-2.5 py-2">
                {selectedCandidate ? (
                  <div
                    className="min-w-0 truncate text-[11px] font-medium text-[var(--color-muted-foreground)]"
                    title={selectedCandidate.model}
                  >
                    {selectedCandidate.model}
                  </div>
                ) : null}
                <AiCandidateContent
                  candidate={selectedCandidate}
                  error={aiBubble.error}
                  loading={aiBubble.loading}
                  scrollClassName={candidateScrollClass}
                />
              </div>
            )}
      </div>
      <div className="shrink-0 border-t border-[var(--color-border)] pt-2">
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

function AiCompareResultsToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={`flex items-center justify-between gap-3 border px-2.5 py-1.5 text-left text-[12px] transition ${
        checked
          ? "border-[var(--color-primary)] bg-[rgba(35,131,226,0.08)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
      }`}
      onMouseDown={preventBubbleBlur}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-4 w-7 shrink-0 border transition ${
          checked
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
            : "border-[var(--color-border)] bg-[var(--color-card)]"
        }`}
      >
        <span
          className={`absolute top-0.5 size-2.5 bg-[var(--color-card)] shadow-sm transition ${
            checked ? "left-[13px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
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

function preventBackdropInteraction(
  event:
    | React.MouseEvent<HTMLDivElement>
    | React.TouchEvent<HTMLDivElement>
    | React.WheelEvent<HTMLDivElement>,
) {
  event.preventDefault();
  event.stopPropagation();
}
