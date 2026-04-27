"use client";

import type { DocumentVersion } from "@/features/app-state/types";
import { useLocale } from "@/components/providers/locale-provider";
import {
  buildVersionDiffHtml,
  htmlToVersionText,
} from "@/features/editor/lib/version-history";

const versionPreviewClassName =
  "syntext-editor syntext-version-preview mx-auto min-h-full max-w-4xl px-10 py-8 pl-16 text-base leading-8";

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
        <div className={`${versionPreviewClassName} text-[var(--color-muted-foreground)]`}>
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

  const diffHtml = buildVersionDiffHtml(currentContent, previousContent, imageLabels);

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-card)]">
      <VersionHtmlRenderer html={diffHtml} emptyLabel={emptyLabel} />
    </div>
  );
}

function VersionHtmlRenderer({ html, emptyLabel }: { html: string; emptyLabel: string }) {
  if (!html.trim()) {
    return (
      <div className={`${versionPreviewClassName} text-[var(--color-foreground)]`}>
        <p className="text-[var(--color-muted-foreground)]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={`${versionPreviewClassName} text-[var(--color-foreground)]`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
