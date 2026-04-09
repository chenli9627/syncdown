import type { Session, SyntextState } from "@/features/app-state/types";

export function resolveBootstrapState(args: {
  savedSession: Session | null;
  savedState: SyntextState | null;
  serverState: SyntextState;
}) {
  const { savedSession, savedState, serverState } = args;

  if (
    savedSession &&
    !serverState.users.some((user) => user.id === savedSession.userId) &&
    savedState?.users.some((user) => user.id === savedSession.userId)
  ) {
    return savedState;
  }

  return serverState;
}

export function shouldApplySyncedState(args: {
  nextState: SyntextState;
  session: Session | null;
}) {
  const { nextState, session } = args;

  if (!session) {
    return true;
  }

  return nextState.users.some((user) => user.id === session.userId);
}
