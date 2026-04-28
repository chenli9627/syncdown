import test from "node:test";
import assert from "node:assert/strict";
import { getDocumentUpdateEntries } from "../src/features/editor/lib/document-updates";
import type { DocumentRecord } from "../src/features/app-state/types";

test("document updates only include changed text parts", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const document = makeDocument([
    {
      content: "<p>Hello brave world</p>",
      createdAt: "2026-01-02T00:00:00.000Z",
      id: "version_new",
      userId: "user_two",
    },
    {
      content: "<p>Hello world</p>",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "version_old",
      userId: "user_one",
    },
  ]);

  const updates = getDocumentUpdateEntries(document);

  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0]?.parts, [{ text: "brave ", type: "added" }]);
  assert.deepEqual(updates[1]?.parts, [{ text: "Hello world", type: "added" }]);
});

test("document updates include removed text parts", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const document = makeDocument([
    {
      content: "<p>Hello world</p>",
      createdAt: "2026-01-02T00:00:00.000Z",
      id: "version_new",
      userId: "user_two",
    },
    {
      content: "<p>Hello old world</p>",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "version_old",
      userId: "user_one",
    },
  ]);

  const updates = getDocumentUpdateEntries(document);

  assert.deepEqual(updates[0]?.parts, [{ text: "old ", type: "removed" }]);
});

function makeDocument(
  versions: Array<{ content: string; createdAt: string; id: string; userId: string }>,
): DocumentRecord {
  return {
    content: versions[0]?.content ?? "",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "document_one",
    lastEditedAt: "2026-01-02T00:00:00.000Z",
    ownerUserId: "user_one",
    status: "private",
    title: "Document",
    versionHistory: versions.map((version) => ({
      ...version,
      title: "Document",
    })),
    workspaceId: "workspace_one",
  };
}
