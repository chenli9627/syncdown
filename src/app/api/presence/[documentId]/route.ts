import { NextResponse } from "next/server";
import {
  getPresenceForDocument,
  removePresence,
  upsertPresence,
} from "@/lib/server/presence-store";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const records = await getPresenceForDocument(documentId);

  return NextResponse.json({ records });
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        anchor?: number;
        avatarUrl?: string | null;
        head?: number;
        name?: string;
        userId?: string;
      }
    | null;

  if (
    !body?.userId ||
    !body.name ||
    typeof body.anchor !== "number" ||
    typeof body.head !== "number"
  ) {
    return NextResponse.json({ error: "Invalid presence payload" }, { status: 400 });
  }

  const records = await upsertPresence({
    anchor: body.anchor,
    avatarUrl: body.avatarUrl ?? null,
    documentId,
    head: body.head,
    name: body.name,
    userId: body.userId,
  });

  return NextResponse.json({ records });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        userId?: string;
      }
    | null;

  if (!body?.userId) {
    return NextResponse.json({ error: "Invalid presence payload" }, { status: 400 });
  }

  await removePresence(documentId, body.userId);

  return NextResponse.json({ ok: true });
}
