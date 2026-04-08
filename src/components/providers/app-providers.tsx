"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppStateProvider } from "@/features/app-state/providers/app-state-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AppStateProvider>{children}</AppStateProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
