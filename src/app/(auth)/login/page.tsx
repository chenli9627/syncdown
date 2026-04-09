"use client";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center px-6 py-12">
      <LoginForm />
    </main>
  );
}
