import test from "node:test";
import assert from "node:assert/strict";
import type { StoredSyntextState } from "../src/features/app-state/types";
import {
  extractManagedMediaFileNames,
  normalizeManagedMediaContent,
  normalizeManagedMediaUrl,
  removeUnreferencedMediaFiles,
} from "../src/lib/server/media-references";

const BASE_STATE: StoredSyntextState = {
  users: [
    {
      id: "user_1",
      email: "one@example.com",
      username: "one",
      name: "One",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      password: "secret",
    },
  ],
  workspaces: [],
  documents: [],
  accesses: [],
  recentVisits: [],
};

test("extracts managed media names from html and api urls", () => {
  const names = extractManagedMediaFileNames(
    '<p><img src="/api/media/a%20file.png" /></p><img src="https://cdn.example.com/other.png" />',
  );

  assert.deepEqual([...names], ["a file.png"]);
});

test("normalizes managed public media URLs to api media URLs", () => {
  process.env.STORAGE_PUBLIC_BASE_URL = "https://cdn.example.com/media/";

  assert.equal(
    normalizeManagedMediaUrl("https://cdn.example.com/media/avatar%201.png"),
    "/api/media/avatar%201.png",
  );
  assert.equal(
    normalizeManagedMediaContent(
      '<p><img src="https://cdn.example.com/media/doc%201.png" /></p>',
    ),
    '<p><img src="/api/media/doc%201.png" /></p>',
  );
});

test("removes only media that is no longer referenced", async () => {
  const previousState: StoredSyntextState = {
    ...BASE_STATE,
    documents: [
      {
        id: "doc_1",
        workspaceId: "ws_1",
        ownerUserId: "user_1",
        title: "Doc",
        content:
          '<p><img src="/api/media/keep.png" /></p><p><img src="/api/media/drop.png" /></p>',
        status: "private",
        trashedFromStatus: null,
        deletedAt: null,
        lastEditedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };

  const nextState: StoredSyntextState = {
    ...previousState,
    documents: [
      {
        ...previousState.documents[0],
        content: '<p><img src="/api/media/keep.png" /></p>',
      },
    ],
  };

  const deleted: string[] = [];

  await removeUnreferencedMediaFiles(
    previousState,
    nextState,
    ["keep.png", "drop.png"],
    async (fileName) => {
      deleted.push(fileName);
    },
  );

  assert.deepEqual(deleted, ["drop.png"]);
});
