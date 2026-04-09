"use client";

import { useLocale } from "@/components/providers/locale-provider";

type EditorActionErrorDialogProps = {
  error: string | null;
  onClose: () => void;
};

export function EditorActionErrorDialog({
  error,
  onClose,
}: EditorActionErrorDialogProps) {
  const { t } = useLocale();
  if (!error) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[120]">
      <div className="sticky top-0 flex h-screen items-center justify-center bg-[rgba(15,23,42,0.18)] px-6">
        <div className="w-full max-w-[420px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">{t("importFailed")}</p>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-6 text-[var(--color-foreground)]">{error}</p>
            <div className="flex justify-end">
              <button
                className="border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
                onClick={onClose}
                type="button"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
