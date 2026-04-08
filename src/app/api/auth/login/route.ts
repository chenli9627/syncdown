import { NextResponse } from "next/server";
import { loginUser } from "@/features/app-state/lib/mutations";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const state = await readStoredState();
  const result = loginUser(state, body.username ?? "", body.password ?? "");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({
    session: result.session,
    state: toPublicState(result.state),
  });
}
