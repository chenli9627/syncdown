"use client";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 px-6 py-12 md:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] md:gap-16">
      <section className="flex items-center justify-center md:justify-start">
        <div className="font-[family-name:var(--font-serif)] text-6xl leading-none tracking-[-0.06em] text-[var(--color-foreground)] sm:text-7xl md:text-8xl">
          Syncdown
        </div>
      </section>
      <section className="flex items-center justify-center md:justify-start">
        <LoginForm />
      </section>
    </main>
  );
}
