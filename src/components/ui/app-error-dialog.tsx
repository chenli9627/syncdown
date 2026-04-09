"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { translateAppError } from "@/lib/i18n/error-messages";

type AppErrorDialogProps = {
  error: string | null;
  onClose: () => void;
  title: string;
};

export function AppErrorDialog({ error, onClose, title }: AppErrorDialogProps) {
  const { locale, t } = useLocale();

  if (!error) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[rgba(15,23,42,0.24)] px-6">
      <div
        aria-modal="true"
        className="w-full max-w-[440px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)]"
        role="dialog"
      >
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
        </div>
        <div className="space-y-4 px-4 py-4">
          <p className="text-sm leading-6 text-[var(--color-foreground)]">
            {translateAppError(error, t, locale) ?? error}
          </p>
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
  );
}
