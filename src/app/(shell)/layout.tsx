import type { ReactNode } from "react";
import { ShellFrame } from "@/features/shell/components/shell-frame";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellFrame>{children}</ShellFrame>;
}
