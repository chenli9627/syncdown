"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { translateAppError } from "@/lib/i18n/error-messages";

export function LoginForm() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { currentUser, login, ready } = useAppState();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !currentUser) {
      return;
    }

    router.replace("/home");
  }, [currentUser, ready, router]);

  return (
    <form
      className="w-full max-w-md space-y-6 border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[rgba(0,0,0,0.01)_0px_1px_3px,rgba(0,0,0,0.02)_0px_3px_7px]"
      onSubmit={async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const username = String(formData.get("username") ?? "");
        const password = String(formData.get("password") ?? "");
        const result = await login(username, password);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setError(null);
        startTransition(() => {
          router.push("/home");
        });
      }}
    >
      <div className="space-y-3">
        <p className="font-[family-name:var(--font-serif)] text-3xl leading-none tracking-[-0.04em] text-[var(--color-foreground)] md:text-4xl">
          Syncdown
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{t("logInTitle")}</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="sr-only" htmlFor="username">
            {t("username")}
          </label>
          <div className="flex h-11 items-center border border-[var(--color-border)] bg-[var(--color-card)] px-3">
            <UserRound className="size-4 text-[var(--color-muted-foreground)]" />
            <input
              autoComplete="username"
              className="h-full w-full bg-transparent px-3 outline-none ring-0 placeholder:text-[var(--color-muted-foreground)]"
              id="username"
              name="username"
              placeholder={t("usernamePlaceholder")}
              type="text"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="sr-only" htmlFor="password">
            {t("password")}
          </label>
          <div className="flex h-11 items-center border border-[var(--color-border)] bg-[var(--color-card)] px-3">
            <KeyRound className="size-4 text-[var(--color-muted-foreground)]" />
            <input
              autoComplete="current-password"
              className="h-full w-full bg-transparent px-3 outline-none ring-0 placeholder:text-[var(--color-muted-foreground)]"
              id="password"
              name="password"
              placeholder={t("passwordPlaceholder")}
              type="password"
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-[#dd5b00]">
            {translateAppError(error, t, locale) ?? error}
          </p>
        ) : null}
        <button
          className="flex h-11 w-full items-center justify-center gap-2 bg-[var(--color-primary)] px-4 text-[15px] font-semibold text-[var(--color-primary-foreground)] disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          <ArrowRight className="size-4" />
          {isPending ? t("opening") : t("logInTitle")}
        </button>
      </div>

      <div className="text-sm text-[var(--color-muted-foreground)]">
        <Link href="/register">{t("register")}</Link>
      </div>
    </form>
  );
}
