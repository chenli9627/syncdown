import { NextResponse } from "next/server";
import {
  moveDocumentToTrashForOwner,
  permanentlyDeleteDocumentFromTrashForOwner,
  restoreDocumentFromTrashForOwner,
} from "@/features/app-state/lib/mutations";
import { getMediaStorageAdapter } from "@/lib/server/media-storage";
import {
  extractManagedMediaFileNames,
  removeUnreferencedMediaFiles,
} from "@/lib/server/media-references";
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
  const result = moveDocumentToTrashForOwner(state, body.userId, documentId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = restoreDocumentFromTrashForOwner(state, body.userId, documentId);

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
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const removedDocument = state.documents.find((document) => document.id === documentId) ?? null;
  const result = permanentlyDeleteDocumentFromTrashForOwner(
    state,
    body.userId,
    documentId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);
  if (removedDocument) {
    await removeUnreferencedMediaFiles(
      state,
      result.state,
      extractManagedMediaFileNames(removedDocument.content),
      (fileName) => getMediaStorageAdapter().deleteFile(fileName),
    );
  }

  return NextResponse.json({ state: toPublicState(result.state) });
}
