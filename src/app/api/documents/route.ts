import { NextResponse } from "next/server";
import { createDocumentForWorkspace } from "@/features/app-state/lib/mutations";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    workspaceId?: string;
  };

  if (!body.userId || !body.workspaceId) {
    return NextResponse.json(
      { error: "You must provide a user and workspace" },
      { status: 400 },
    );
  }

  const state = await readStoredState();
  const result = createDocumentForWorkspace(state, body.userId, body.workspaceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({
    state: toPublicState(result.state),
    documentId: result.documentId,
  });
}
