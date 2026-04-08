import { NextResponse } from "next/server";
import { markDocumentVisited } from "@/features/app-state/lib/mutations";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = markDocumentVisited(state, body.userId, documentId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}
