"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl items-center gap-8 px-6 py-12 md:grid-cols-[minmax(14rem,1fr)_minmax(20rem,24rem)] md:gap-10">
      <section className="flex items-center justify-center md:justify-start">
        <div className="w-full max-w-sm space-y-3 text-center md:text-left">
          <div className="font-[family-name:var(--font-serif)] text-6xl leading-none tracking-[-0.06em] text-[var(--color-foreground)] sm:text-7xl md:text-8xl">
            Syncdown
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("tagline")}</p>
        </div>
      </section>
      <section className="flex items-center justify-center md:justify-start">
        <LoginForm />
      </section>
    </main>
  );
}
