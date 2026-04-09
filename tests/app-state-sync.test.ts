import test from "node:test";
import assert from "node:assert/strict";
import type { Session, SyntextState } from "../src/features/app-state/types";
import {
  resolveBootstrapState,
  shouldApplySyncedState,
} from "../src/features/app-state/hooks/app-state-sync-shared";

const savedSession: Session = {
  currentWorkspaceId: "ws_new",
  userId: "user_new",
};

function createState(userIds: string[]): SyntextState {
  return {
    accesses: [],
    documents: [],
    recentVisits: [],
    users: userIds.map((id, index) => ({
      avatarUrl: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      email: `${id}@example.com`,
      id,
      name: `User ${index + 1}`,
      username: id,
    })),
    workspaces: userIds.map((id, index) => ({
      createdAt: "2026-04-01T00:00:00.000Z",
      id: `ws_${index + 1}`,
      lastAccessedAt: "2026-04-01T00:00:00.000Z",
      name: `Workspace ${index + 1}`,
      ownerUserId: id,
    })),
  };
}

test("bootstrap prefers saved state when server state loses the current session user", () => {
  const savedState = createState(["user_new"]);
  const serverState = createState(["user_owner"]);

  const resolved = resolveBootstrapState({
    savedSession,
    savedState,
    serverState,
  });

  assert.equal(resolved, savedState);
});

test("bootstrap keeps server state when it already contains the current session user", () => {
  const savedState = createState(["user_new"]);
  const serverState = createState(["user_owner", "user_new"]);

  const resolved = resolveBootstrapState({
    savedSession,
    savedState,
    serverState,
  });

  assert.equal(resolved, serverState);
});

test("sync rejects server snapshots that would drop the active session user", () => {
  const nextState = createState(["user_owner"]);

  assert.equal(
    shouldApplySyncedState({
      nextState,
      session: savedSession,
    }),
    false,
  );
});

test("sync accepts snapshots when there is no active session", () => {
  const nextState = createState(["user_owner"]);

  assert.equal(
    shouldApplySyncedState({
      nextState,
      session: null,
    }),
    true,
  );
});
