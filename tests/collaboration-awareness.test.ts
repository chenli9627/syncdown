import test from "node:test";
import assert from "node:assert/strict";
import {
  toRemoteEntries,
  type AwarenessState,
} from "@/features/editor/hooks/use-editor-collaboration";

function createAwareness(states: AwarenessState[]) {
  return {
    getStates() {
      return new Map(states.map((state, index) => [index + 1, state]));
    },
  };
}

test("toRemoteEntries filters current user and prefers entries with cursor heads", () => {
  const awareness = createAwareness([
    {
      user: {
        color: "#111111",
        name: "One",
        userId: "user-one",
      },
    },
    {
      user: {
        color: "#111111",
        name: "One",
        userId: "user-one",
      },
      cursor: {
        anchor: { type: "relative", index: 3 },
        head: { type: "relative", index: 4 },
      },
    },
    {
      user: {
        avatarUrl: "/avatar-two.png",
        color: "#222222",
        name: "Two",
        userId: "user-two",
      },
      cursor: {
        anchor: { type: "relative", index: 8 },
        head: { type: "relative", index: 9 },
      },
    },
    {
      user: {
        color: "#333333",
        name: "Me",
        userId: "me",
      },
      cursor: {
        anchor: { type: "relative", index: 1 },
        head: { type: "relative", index: 1 },
      },
    },
  ]);

  const entries = toRemoteEntries(
    awareness as Parameters<typeof toRemoteEntries>[0],
    "me",
  );

  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.userId).sort(),
    ["user-one", "user-two"],
  );

  const one = entries.find((entry) => entry.userId === "user-one");
  assert.ok(one);
  assert.deepEqual(one.head, { type: "relative", index: 4 });

  const two = entries.find((entry) => entry.userId === "user-two");
  assert.ok(two);
  assert.equal(two.avatarUrl, "/avatar-two.png");
});

test("toRemoteEntries keeps latest duplicate entry when both have cursor heads", () => {
  const awareness = createAwareness([
    {
      user: {
        color: "#111111",
        name: "One",
        userId: "user-one",
      },
      cursor: {
        anchor: { type: "relative", index: 1 },
        head: { type: "relative", index: 2 },
      },
    },
    {
      user: {
        avatarUrl: "/avatar-one.png",
        color: "#111111",
        name: "One",
        userId: "user-one",
      },
      cursor: {
        anchor: { type: "relative", index: 5 },
        head: { type: "relative", index: 6 },
      },
    },
  ]);

  const entries = toRemoteEntries(
    awareness as Parameters<typeof toRemoteEntries>[0],
    null,
  );

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].head, { type: "relative", index: 6 });
  assert.equal(entries[0].avatarUrl, "/avatar-one.png");
});
