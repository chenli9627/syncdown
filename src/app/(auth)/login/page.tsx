"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-[minmax(20rem,1.25fr)_minmax(22rem,24rem)] md:gap-20 lg:px-10">
      <section className="relative z-10 flex items-center justify-center md:justify-start">
        <div className="w-full max-w-lg space-y-4 text-center md:pl-4 md:pr-8 md:text-left lg:pl-6">
          <div className="font-[family-name:var(--font-serif)] text-7xl leading-none tracking-[-0.06em] text-[var(--color-foreground)] sm:text-8xl md:text-9xl">
            Syncdown
          </div>
          <p className="text-lg leading-8 text-[var(--color-muted-foreground)] md:text-xl">
            {t("tagline")}
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center md:justify-start">
        <LoginForm />
      </section>
    </main>
  );
}
