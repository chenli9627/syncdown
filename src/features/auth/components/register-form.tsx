"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  AtSign,
  Fingerprint,
  KeyRound,
  UserRound,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppState } from "@/features/app-state/providers/app-state-provider";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useLocale();
  const { currentUser, ready, register } = useAppState();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fields = [
    {
      label: t("email"),
      type: "email",
      autoComplete: "email",
      icon: AtSign,
      name: "email",
    },
    {
      label: t("username"),
      type: "text",
      autoComplete: "username",
      icon: Fingerprint,
      name: "username",
    },
    {
      label: t("name"),
      type: "text",
      autoComplete: "name",
      icon: UserRound,
      name: "name",
    },
    {
      label: t("password"),
      type: "password",
      autoComplete: "new-password",
      icon: KeyRound,
      name: "password",
    },
  ] as const;

  useEffect(() => {
    if (!ready || !currentUser) {
      return;
    }

    router.replace("/home");
  }, [currentUser, ready, router]);

  return (
    <form
      className="w-full border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_8px] md:p-10"
      onSubmit={async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const result = await register({
          email: String(formData.get("email") ?? ""),
          username: String(formData.get("username") ?? ""),
          name: String(formData.get("name") ?? ""),
          password: String(formData.get("password") ?? ""),
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setError(null);
        startTransition(() => {
          router.push("/login");
        });
      }}
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {t("newAccount")}
        </p>
        <h1 className="text-3xl font-semibold">{t("signUpTitle")}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t("registerDescription")}
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {fields.map((field) => (
          <div className="space-y-2" key={field.label}>
            <label className="text-sm font-medium" htmlFor={field.name}>
              {field.label}
            </label>
            <div className="flex h-11 items-center border border-[var(--color-border)] bg-[var(--color-card)] px-3">
              <field.icon className="size-4 text-[var(--color-muted-foreground)]" />
              <input
                autoComplete={field.autoComplete}
                className="h-full w-full bg-transparent px-3 outline-none placeholder:text-[var(--color-muted-foreground)]"
                id={field.name}
                name={field.name}
                type={field.type}
              />
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-[#dd5b00]">{error}</p> : null}

      <button
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 bg-[var(--color-primary)] px-4 text-[15px] font-semibold text-[var(--color-primary-foreground)] disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        <ArrowRight className="size-4" />
        {isPending ? t("creating") : t("signUpTitle")}
      </button>

      <div className="mt-4 text-sm text-[var(--color-muted-foreground)]">
        <a href="/login">{t("existingUserLogIn")}</a>
      </div>
    </form>
  );
}
