import { NextResponse } from "next/server";
import { registerUser } from "@/features/app-state/lib/mutations";
import { readStoredState, toPublicState, writeStoredState } from "@/lib/server/state-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    username?: string;
    name?: string;
    password?: string;
  };

  const state = await readStoredState();
  const result = registerUser(state, {
    email: body.email ?? "",
    username: body.username ?? "",
    name: body.name ?? "",
    password: body.password ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeStoredState(result.state);

  return NextResponse.json({ state: toPublicState(result.state) });
}
