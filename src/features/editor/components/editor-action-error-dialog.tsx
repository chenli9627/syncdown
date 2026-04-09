"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { AppErrorDialog } from "@/components/ui/app-error-dialog";

type EditorActionErrorDialogProps = {
  error: string | null;
  onClose: () => void;
};

export function EditorActionErrorDialog({
  error,
  onClose,
}: EditorActionErrorDialogProps) {
  const { t } = useLocale();
  const title = (() => {
    if (!error) {
      return t("editorActionFailed");
    }

    if (error === t("downloadImageFailed")) {
      return t("downloadImageFailed");
    }

    return t("editorActionFailed");
  })();

  return <AppErrorDialog error={error} onClose={onClose} title={title} />;
}
