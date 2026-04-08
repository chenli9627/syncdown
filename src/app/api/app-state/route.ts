import { NextResponse } from "next/server";
import { readStoredState, toPublicState } from "@/lib/server/state-store";

export async function GET() {
  const state = await readStoredState();

  return NextResponse.json({ state: toPublicState(state) });
}
