import { NextResponse } from "next/server";
import {
  deleteWorkspaceForUser,
  renameWorkspaceForUser,
} from "@/features/app-state/lib/mutations";
import { getMediaStorageAdapter } from "@/lib/server/media-storage";
import {
  extractManagedMediaFileNames,
  removeUnreferencedMediaFiles,
} from "@/lib/server/media-references";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    name?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = renameWorkspaceForUser(
    state,
    body.userId,
    workspaceId,
    body.name ?? "",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  const body = (await request.json()) as {
    userId?: string;
    confirmName?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const removedDocuments = state.documents.filter((document) => document.workspaceId === workspaceId);
  const result = deleteWorkspaceForUser(
    state,
    body.userId,
    workspaceId,
    body.confirmName ?? "",
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);
  await removeUnreferencedMediaFiles(
    state,
    result.state,
    removedDocuments.flatMap((document) => [...extractManagedMediaFileNames(document.content)]),
    (fileName) => getMediaStorageAdapter().deleteFile(fileName),
  );

  return NextResponse.json({ state: toPublicState(result.state) });
}
