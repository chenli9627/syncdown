import { NextResponse } from "next/server";
import { updateProfileNameForUser } from "@/features/app-state/lib/mutations";
import {
  readStoredState,
  toPublicState,
  writeStoredState,
} from "@/lib/server/state-store";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        userId?: string;
      }
    | null;

  if (!body?.userId) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const state = await readStoredState();
  const result = updateProfileNameForUser(state, body.userId, body.name ?? "");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({
    state: toPublicState(result.state),
  });
}
