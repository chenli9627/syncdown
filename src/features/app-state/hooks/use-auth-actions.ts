"use client";

import { useMemo } from "react";
import type { Session, SyntextState } from "@/features/app-state/types";
import {
  type RegisterInput,
  type Result,
} from "@/features/app-state/hooks/app-state-actions-shared";
import { readJson } from "@/features/app-state/hooks/use-app-state-sync";

type UseAuthActionsArgs = {
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setState: React.Dispatch<React.SetStateAction<SyntextState>>;
};

export function useAuthActions({ setSession, setState }: UseAuthActionsArgs) {
  return useMemo(
    () => ({
      login: async (username: string, password: string): Promise<Result> => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await readJson<
          | { error: string }
          | { session: Session; state: SyntextState }
        >(response);

        if (!response.ok || !("session" in data)) {
          return {
            ok: false,
            error: "error" in data ? data.error : "Login failed",
          };
        }

        setState(data.state);
        setSession(data.session);

        return { ok: true };
      },
      register: async (input: RegisterInput): Promise<Result> => {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Registration failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      logout: () => {
        setSession(null);
      },
      updateProfileName: async (userId: string, name: string): Promise<Result> => {
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Profile update failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      updateProfileAvatar: async (
        userId: string,
        avatarUrl: string | null,
      ): Promise<Result> => {
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, avatarUrl }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Profile update failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
      changePassword: async (
        userId: string,
        currentPassword: string,
        newPassword: string,
      ): Promise<Result> => {
        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, currentPassword, newPassword }),
        });
        const data = await readJson<{ error?: string; state?: SyntextState }>(response);

        if (!response.ok || !data.state) {
          return {
            ok: false,
            error: data.error ?? "Password update failed",
          };
        }

        setState(data.state);

        return { ok: true };
      },
    }),
    [setSession, setState],
  );
}
