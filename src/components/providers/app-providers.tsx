"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppStateProvider } from "@/features/app-state/providers/app-state-provider";
import type { Locale } from "@/lib/i18n/messages";

type AppProvidersProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function AppProviders({ children, initialLocale }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LocaleProvider initialLocale={initialLocale}>
        <AppStateProvider>{children}</AppStateProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
