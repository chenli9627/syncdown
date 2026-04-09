import { NextResponse } from "next/server";
import {
  updateProfileAvatarForUser,
  updateProfileNameForUser,
} from "@/features/app-state/lib/mutations";
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

  return NextResponse.json({
    state: toPublicState(state),
  });
}
