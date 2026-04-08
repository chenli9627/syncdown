import { NextResponse } from "next/server";
import { createWorkspaceForUser } from "@/features/app-state/lib/mutations";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    name?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = createWorkspaceForUser(state, body.userId, body.name ?? "");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({
    state: toPublicState(result.state),
    workspaceId: result.workspace.id,
  });
}
