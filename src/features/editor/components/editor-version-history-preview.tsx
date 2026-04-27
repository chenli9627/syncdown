"use client";

import type { DocumentRecord, DocumentVersion } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";
import {
  diffVersionText,
  htmlToVersionText,
} from "@/features/editor/lib/version-history";

type EditorVersionHistoryPreviewProps = {
  document: DocumentRecord;
  selectedVersion: DocumentVersion | null;
};

export function EditorVersionHistoryPreview({
  document,
  selectedVersion,
}: EditorVersionHistoryPreviewProps) {
  const { t } = useLocale();
  const previousText = htmlToVersionText(selectedVersion?.content ?? document.content);
  const currentText = htmlToVersionText(document.content);
  const parts = selectedVersion
    ? diffVersionText(previousText, currentText)
    : [{ text: currentText, type: "unchanged" as const }];

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
      <div className="syntext-editor mx-auto min-h-full max-w-4xl px-12 py-10 text-base leading-8 text-[var(--color-foreground)]">
        <div className="whitespace-pre-wrap">
          {parts.length > 0 ? (
            parts.map((part, index) => (
              <span
                className={
                  part.type === "added"
                    ? "text-[var(--color-primary)]"
                    : part.type === "removed"
                      ? "text-[var(--color-muted-foreground)] line-through"
                      : undefined
                }
                key={`${part.type}-${index}`}
              >
                {part.text}
              </span>
            ))
          ) : (
            <span className="text-[var(--color-muted-foreground)]">{t("emptyPage")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
