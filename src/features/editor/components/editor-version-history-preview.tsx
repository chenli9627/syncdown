"use client";

import type { DocumentVersion } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";
import {
  diffVersionText,
  htmlToVersionText,
} from "@/features/editor/lib/version-history";

type EditorVersionHistoryPreviewProps = {
  currentContent: string;
  previousContent: string | null;
  selectedVersion: DocumentVersion | null;
};

export function EditorVersionHistoryPreview({
  currentContent,
  previousContent,
  selectedVersion,
}: EditorVersionHistoryPreviewProps) {
  const { t } = useLocale();

  if (!selectedVersion) {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
        <div className="syntext-editor mx-auto min-h-full max-w-4xl px-12 py-10 text-sm leading-6 text-[var(--color-muted-foreground)]">
          <p>{t("noVersionHistoryDescription")}</p>
        </div>
      </div>
    );
  }

  const emptyLabel = t("emptyPage");
  const imageLabels = {
    single: `[${t("versionImagePlaceholder")}]`,
    plural: (count: number) => `[${count} ${t("versionImagePlaceholder")}]`,
  };

  if (previousContent === null) {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
        <VersionHtmlRenderer html={currentContent} emptyLabel={emptyLabel} />
      </div>
    );
  }

  const currentText = htmlToVersionText(currentContent, imageLabels);
  const previousText = htmlToVersionText(previousContent, imageLabels);

  if (currentText === previousText) {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
        <VersionHtmlRenderer html={currentContent} emptyLabel={emptyLabel} />
      </div>
    );
  }

  const parts = diffVersionText(previousText, currentText);

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
      <div className="mx-auto min-h-full max-w-4xl px-12 py-10 text-sm leading-6">
        <div className="mb-6 border-b border-[var(--color-border)] pb-4 text-xs text-[var(--color-muted-foreground)]">
          {t("versionDiffLabel")}
        </div>
        <div className="whitespace-pre-wrap text-[var(--color-foreground)]">
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
            <span className="text-[var(--color-muted-foreground)]">{emptyLabel}</span>
          )}
        </div>
        <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-foreground)]">
          {t("versionPreviewLabel")}
        </div>
        <div className="syntext-editor mt-2">
          <VersionHtmlContent html={currentContent} emptyLabel={emptyLabel} />
        </div>
      </div>
    </div>
  );
}

function VersionHtmlRenderer({ html, emptyLabel }: { html: string; emptyLabel: string }) {
  return (
    <div className="syntext-editor mx-auto min-h-full max-w-4xl px-12 py-10 text-sm leading-6 text-[var(--color-foreground)]">
      <VersionHtmlContent html={html} emptyLabel={emptyLabel} />
    </div>
  );
}

function VersionHtmlContent({ html, emptyLabel }: { html: string; emptyLabel: string }) {
  if (!html.trim()) {
    return <p className="text-[var(--color-muted-foreground)]">{emptyLabel}</p>;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}