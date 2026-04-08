"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { DocumentStatusState } from "@/features/editor/components/document-status-state";

type DocumentShellGateProps = {
  mode: "deleted" | "no_access";
};

export function DocumentShellGate({ mode }: DocumentShellGateProps) {
  const { t } = useLocale();

  if (mode === "deleted") {
    return (
      <DocumentStatusState
        description={t("deletedDescription")}
        title={t("deletedTitle")}
      />
    );
  }

  return (
    <DocumentStatusState
      description={t("noAccessNotice")}
      title={t("noAccessTitle")}
    />
  );
}
