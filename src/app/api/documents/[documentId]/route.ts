import { NextResponse } from "next/server";
import {
  removeDocumentAccessForOwner,
  shareDocumentWithUser,
  updateDocumentAccessForOwner,
  updateDocumentForUser,
} from "@/features/app-state/lib/mutations";
import {
  getMediaStorageAdapter,
} from "@/lib/server/media-storage";
import {
  extractManagedMediaFileNames,
  removeUnreferencedMediaFiles,
} from "@/lib/server/media-references";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    title?: string;
    content?: string;
    versionHistoryMode?: "force" | "merge" | "snapshot";
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const previousDocument = state.documents.find((document) => document.id === documentId) ?? null;
  const result = updateDocumentForUser(state, body.userId, documentId, {
    title: body.title,
    content: body.content,
    versionHistoryMode: body.versionHistoryMode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);
  if (body.content !== undefined && previousDocument) {
    await removeUnreferencedMediaFiles(
      state,
      result.state,
      extractManagedMediaFileNames(previousDocument.content),
      (fileName) => getMediaStorageAdapter().deleteFile(fileName),
    );
  }

  return NextResponse.json({ state: toPublicState(result.state) });
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    email?: string;
    permission?: "can_edit" | "can_view";
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = shareDocumentWithUser(
    state,
    body.userId,
    documentId,
    body.email ?? "",
    body.permission ?? "can_view",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}

export async function PUT(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    targetUserId?: string;
    permission?: "can_edit" | "can_view";
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  if (!body.targetUserId) {
    return NextResponse.json({ error: "Target user is required" }, { status: 400 });
  }

  const state = await readStoredState();
  const result = updateDocumentAccessForOwner(
    state,
    body.userId,
    documentId,
    body.targetUserId,
    body.permission ?? "can_view",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    targetUserId?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  if (!body.targetUserId) {
    return NextResponse.json({ error: "Target user is required" }, { status: 400 });
  }

  const state = await readStoredState();
  const result = removeDocumentAccessForOwner(
    state,
    body.userId,
    documentId,
    body.targetUserId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}
