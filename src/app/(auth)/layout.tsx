import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent px-6 py-8 md:px-10 md:py-10">
      {children}
    </div>
  );
}
