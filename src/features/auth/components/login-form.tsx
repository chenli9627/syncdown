"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";

export function LoginForm() {
  const router = useRouter();
  const { currentUser, login, ready } = useAppState();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showResetHelp, setShowResetHelp] = useState(false);

  useEffect(() => {
    if (!ready || !currentUser) {
      return;
    }

    router.replace("/home");
  }, [currentUser, ready, router]);

  return (
    <form
      className="w-full space-y-6 border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[rgba(0,0,0,0.01)_0px_1px_3px,rgba(0,0,0,0.02)_0px_3px_7px]"
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
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Entry
        </p>
        <h2 className="text-3xl font-semibold">Log in</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Use the seed account `owner / ownerpass123` or `guest / guestpass123`.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="username">
            Username
          </label>
          <div className="flex h-11 items-center border border-[var(--color-border)] bg-[var(--color-card)] px-3">
            <UserRound className="size-4 text-[var(--color-muted-foreground)]" />
            <input
              autoComplete="username"
              className="h-full w-full bg-transparent px-3 outline-none ring-0 placeholder:text-[var(--color-muted-foreground)]"
              id="username"
              name="username"
              placeholder="username"
              type="text"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <div className="flex h-11 items-center border border-[var(--color-border)] bg-[var(--color-card)] px-3">
            <KeyRound className="size-4 text-[var(--color-muted-foreground)]" />
            <input
              autoComplete="current-password"
              className="h-full w-full bg-transparent px-3 outline-none ring-0 placeholder:text-[var(--color-muted-foreground)]"
              id="password"
              name="password"
              placeholder="password"
              type="password"
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-[#dd5b00]">{error}</p>
        ) : null}
        <button
          className="flex h-11 w-full items-center justify-center gap-2 bg-[var(--color-primary)] px-4 text-[15px] font-semibold text-[var(--color-primary-foreground)] disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          <ArrowRight className="size-4" />
          {isPending ? "Opening…" : "Log in"}
        </button>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
        <a href="/register">New user? Sign up</a>
        <button
          onClick={() => {
            setShowResetHelp((current) => !current);
          }}
          type="button"
        >
          Forget your password?
        </button>
      </div>

      {showResetHelp ? (
        <div className="border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          <p>If you forget your password, ask the administrator to run:</p>
          <p className="mt-2 font-mono text-[13px] text-[var(--color-foreground)]">
            pnpm reset-password --username &lt;username&gt; --password &lt;new-password&gt;
          </p>
        </div>
      ) : null}
    </form>
  );
}
