"use client";

import { readJson } from "@/features/app-state/hooks/use-app-state-sync";
import type { Session, SyntextState, User, Workspace } from "@/features/app-state/types";

export type UseDocumentActionsArgs = {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
  state: SyntextState;
};

export async function readDocumentState(
  response: Response,
  fallback: string,
) {
  const data = await readJson<{ error?: string; state?: SyntextState }>(response);
  if (!response.ok || !data.state) {
    return { ok: false as const, error: data.error ?? fallback };
  }
  return { ok: true as const, state: data.state };
}
