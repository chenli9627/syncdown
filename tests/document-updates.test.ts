import test from "node:test";
import assert from "node:assert/strict";
import {
  getDocumentUpdateEntries,
  getDocumentUpdateParts,
} from "../src/features/editor/lib/document-updates";
import type { DocumentRecord } from "../src/features/app-state/types";

const UPDATE_LABELS = {
  imageSingle: "[Image]",
  tableOfContents: "Table of Contents",
  title: "Title",
};

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
  assert.deepEqual(
    updates[0] ? getDocumentUpdateParts(updates[0], UPDATE_LABELS) : [],
    [{ text: "brave ", type: "added" }],
  );
  assert.deepEqual(
    updates[1] ? getDocumentUpdateParts(updates[1], UPDATE_LABELS) : [],
    [{ text: "Hello world", type: "added" }],
  );
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

  assert.deepEqual(
    updates[0] ? getDocumentUpdateParts(updates[0], UPDATE_LABELS) : [],
    [{ text: "old ", type: "removed" }],
  );
});

test("document updates include rich text structure", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const document = makeDocument([
    {
      content: [
        "<h2>Plan</h2>",
        "<ul><li><p>First item</p></li></ul>",
        '<p><a href="https://example.com">Link</a></p>',
        "<pre><code>const a = 1;</code></pre>",
        "<table><tbody><tr><th>Name</th><th>Status</th></tr><tr><td>A</td><td>Done</td></tr></tbody></table>",
      ].join(""),
      createdAt: "2026-01-02T00:00:00.000Z",
      id: "version_new",
      userId: "user_two",
    },
    {
      content: "<p>Plan</p>",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "version_old",
      userId: "user_one",
    },
  ]);

  const updates = getDocumentUpdateEntries(document);
  const addedText = (updates[0] ? getDocumentUpdateParts(updates[0], UPDATE_LABELS) : [])
    .filter((part) => part.type === "added")
    .map((part) => part.text)
    .join("");

  assert.match(addedText ?? "", /## /);
  assert.match(addedText ?? "", /- First item/);
  assert.match(addedText ?? "", /\[Link\]\(https:\/\/example.com\)/);
  assert.match(addedText ?? "", /```/);
  assert.match(addedText ?? "", /Name \| Status/);
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
    updateHistory: versions.map((version, index) => ({
      createdAt: version.createdAt,
      id: version.id,
      nextContent: version.content,
      nextTitle: "Document",
      previousContent: versions[index + 1]?.content ?? "",
      previousTitle: "Document",
      userId: version.userId,
    })),
    workspaceId: "workspace_one",
  };
}
