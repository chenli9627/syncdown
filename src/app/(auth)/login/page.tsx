import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 border border-[var(--color-border)] bg-[var(--color-card)] shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_8px] md:grid-cols-[1.08fr_0.92fr]">
      <section className="flex flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-muted)] p-8 text-[var(--color-foreground)] md:p-10">
        <div className="space-y-4">
          <div className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[var(--color-accent-foreground)]">
            Syncdown v2
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
            Write privately. Share by workspace.
          </h1>
          <p className="max-w-md text-sm leading-6 text-[var(--color-muted-foreground)] md:text-base">
            The rebuild starts with clear ownership, guest-safe sharing, and an
            editor that can grow into collaboration.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-[var(--color-muted-foreground)] md:grid-cols-2">
          <div className="border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            Owner-controlled permissions
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            Workspace-aware document access
          </div>
        </div>
      </section>

      <section className="flex items-center p-8 md:p-10">
        <LoginForm />
      </section>
    </main>
  );
}
