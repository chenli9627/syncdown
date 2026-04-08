"use client";

import { readJson } from "@/features/app-state/hooks/use-app-state-sync";
import type { SyntextState } from "@/features/app-state/types";

export type Result =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export type RegisterInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

export async function readStateResponse(
  response: Response,
  fallbackError: string,
) {
  const data = await readJson<{ error?: string; state?: SyntextState }>(response);

  if (!response.ok || !data.state) {
    return {
      ok: false as const,
      error: data.error ?? fallbackError,
    };
  }

  return {
    ok: true as const,
    state: data.state,
  };
}
