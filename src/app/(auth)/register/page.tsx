import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
      <RegisterForm />
    </main>
  );
}
