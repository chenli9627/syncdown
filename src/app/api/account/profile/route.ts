import { NextResponse } from "next/server";
import {
  updateProfileAvatarForUser,
  updateProfileNameForUser,
} from "@/features/app-state/lib/mutations";
import { getMediaStorageAdapter } from "@/lib/server/media-storage";
import {
  extractManagedMediaFileNames,
  removeUnreferencedMediaFiles,
} from "@/lib/server/media-references";
import {
  readStoredState,
  toPublicState,
  writeStoredState,
} from "@/lib/server/state-store";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        avatarUrl?: string | null;
        name?: string;
        userId?: string;
      }
    | null;

  if (!body?.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  let state = await readStoredState();
  const previousUser = state.users.find((user) => user.id === body.userId) ?? null;

  if (body.name !== undefined) {
    const result = updateProfileNameForUser(state, body.userId, body.name ?? "");

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    state = result.state;
  }

  if (body.avatarUrl !== undefined) {
    const result = updateProfileAvatarForUser(
      state,
      body.userId,
      body.avatarUrl ?? null,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    state = result.state;
  }

  await writeStoredState(state);
  if (body.avatarUrl !== undefined && previousUser) {
    await removeUnreferencedMediaFiles(
      {
        ...state,
        users: state.users.map((user) =>
          user.id === previousUser.id ? { ...user, avatarUrl: previousUser.avatarUrl } : user,
        ),
      },
      state,
      extractManagedMediaFileNames(previousUser.avatarUrl),
      (fileName) => getMediaStorageAdapter().deleteFile(fileName),
    );
  }

  return NextResponse.json({
    state: toPublicState(state),
  });
}
