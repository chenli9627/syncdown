import test from "node:test";
import assert from "node:assert/strict";
import type { StoredSyntextState } from "../src/features/app-state/types";
import {
  removeDocumentAccessForOwner,
  shareDocumentWithUser,
  updateDocumentAccessForOwner,
} from "../src/features/app-state/lib/mutations/document-access";
import {
  createDocumentForWorkspace,
  updateDocumentForUser,
} from "../src/features/app-state/lib/mutations/document-editing";
import {
  moveDocumentToTrashForOwner,
  restoreDocumentFromTrashForOwner,
} from "../src/features/app-state/lib/mutations/document-trash";

function createState(): StoredSyntextState {
  return {
    accesses: [
      {
        documentId: "doc_shared",
        permission: "can_view",
        userId: "user_two",
      },
    ],
    documents: [
      {
        content: "<p>Shared content</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_shared",
        lastEditedAt: "2026-04-03T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "shared",
        title: "Shared doc",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
      {
        content: "<p>Existing collision</p>",
        createdAt: "2026-04-01T00:00:00.000Z",
        deletedAt: null,
        id: "doc_collision",
        lastEditedAt: "2026-04-02T00:00:00.000Z",
        ownerUserId: "user_one",
        status: "private",
        title: "Shared doc",
        trashedFromStatus: null,
        workspaceId: "ws_one",
      },
    ],
    recentVisits: [
      {
        documentId: "doc_shared",
        userId: "user_two",
        visitedAt: "2026-04-04T00:00:00.000Z",
      },
    ],
    users: [
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "one@example.com",
        id: "user_one",
        name: "One",
        passwordHash: "hash-1",
        username: "one",
      },
      {
        avatarUrl: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "two@example.com",
        id: "user_two",
        name: "Two",
        passwordHash: "hash-2",
        username: "two",
      },
    ],
    workspaces: [
      {
        createdAt: "2026-04-01T00:00:00.000Z",
        id: "ws_one",
        lastAccessedAt: "2026-04-04T00:00:00.000Z",
        name: "Workspace One",
        ownerUserId: "user_one",
      },
    ],
  };
}

test("removing the last guest returns a shared document to private", () => {
  const result = removeDocumentAccessForOwner(createState(), "user_one", "doc_shared", "user_two");

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.status, "private");
  assert.equal(
    result.state.accesses.some((entry) => entry.documentId === "doc_shared"),
    false,
  );
});

test("restoring a trashed document resolves title collisions", () => {
  const moved = moveDocumentToTrashForOwner(createState(), "user_one", "doc_shared");

  assert.equal(moved.ok, true);
  if (!moved.ok) {
    return;
  }

  const restored = restoreDocumentFromTrashForOwner(moved.state, "user_one", "doc_shared");
  assert.equal(restored.ok, true);
  if (!restored.ok) {
    return;
  }

  const document = restored.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.status, "shared");
  assert.equal(document?.title, "Shared doc (Restored)");
});

test("creating a document assigns the next untitled title immediately", () => {
  const result = createDocumentForWorkspace(createState(), "user_one", "ws_one");

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === result.documentId);
  assert.equal(document?.title, "Untitled");
});

test("guest cannot edit document title", () => {
  const result = updateDocumentForUser(createState(), "user_two", "doc_shared", {
    title: "New title",
  });

  assert.deepEqual(result, {
    error: "Only the workspace owner can edit the document title",
    ok: false,
  });
});

test("saving document content records previous content in version history", () => {
  const result = updateDocumentForUser(createState(), "user_one", "doc_shared", {
    content: "<p>Next content</p>",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.content, "<p>Next content</p>");
  assert.equal(document?.versionHistory?.length, 1);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>Shared content</p>");
  assert.equal(document?.versionHistory?.[0]?.userId, "user_one");
});

test("saving unchanged content does not create version history", () => {
  const result = updateDocumentForUser(createState(), "user_one", "doc_shared", {
    content: "<p>Shared content</p>",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory, undefined);
});

test("initial blank editor autosave does not create version history", () => {
  const created = createDocumentForWorkspace(createState(), "user_one", "ws_one");

  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const saved = updateDocumentForUser(created.state, "user_one", created.documentId, {
    content: "<p></p>",
  });

  assert.equal(saved.ok, true);
  if (!saved.ok) {
    return;
  }

  const document = saved.state.documents.find((entry) => entry.id === created.documentId);
  assert.equal(document?.content, "<p></p>");
  assert.equal(document?.versionHistory, undefined);
});

test("whitespace-only edits in non-empty documents create version history", () => {
  const result = updateDocumentForUser(
    {
      ...createState(),
      documents: createState().documents.map((document) =>
        document.id === "doc_shared"
          ? {
              ...document,
              content: "<p>Shared content</p><p><br></p>",
            }
          : document,
      ),
    },
    "user_one",
    "doc_shared",
    {
      content: "<p>  Shared   content&nbsp;</p><p></p><p><br /></p>",
    },
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory?.length, 1);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>Shared content</p><p><br></p>");
});

test("blank snapshots do not create version history", () => {
  const created = createDocumentForWorkspace(createState(), "user_one", "ws_one");

  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const snapshotted = updateDocumentForUser(created.state, "user_one", created.documentId, {
    content: "<p> </p><p><br></p>",
    versionHistoryMode: "snapshot",
  });

  assert.equal(snapshotted.ok, true);
  if (!snapshotted.ok) {
    return;
  }

  const document = snapshotted.state.documents.find((entry) => entry.id === created.documentId);
  assert.equal(document?.versionHistory, undefined);
});

test("snapshot saves preserve whitespace-only variants", () => {
  const state = {
    ...createState(),
    documents: createState().documents.map((document) =>
      document.id === "doc_shared"
        ? {
            ...document,
            content: "<p>  Shared   content&nbsp;</p><p><br></p>",
            versionHistory: [
              {
                content: "<p>Other content</p>",
                createdAt: "2026-04-01T00:10:00.000Z",
                id: "version_other",
                title: "Shared doc",
                userId: "user_one",
              },
              {
                content: "<p>Shared content</p>",
                createdAt: "2026-04-01T00:00:00.000Z",
                id: "version_shared",
                title: "Shared doc",
                userId: "user_one",
              },
            ],
          }
        : document,
    ),
  };
  const snapshotted = updateDocumentForUser(state, "user_one", "doc_shared", {
    content: "<p>  Shared   content&nbsp;</p><p><br></p>",
    versionHistoryMode: "snapshot",
  });

  assert.equal(snapshotted.ok, true);
  if (!snapshotted.ok) {
    return;
  }

  const document = snapshotted.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory?.length, 3);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>  Shared   content&nbsp;</p><p><br></p>");
  assert.equal(document?.versionHistory?.[1]?.content, "<p>Other content</p>");
  assert.equal(document?.versionHistory?.[2]?.content, "<p>Shared content</p>");
});

test("nearby autosaves merge into one stable version history entry", () => {
  const first = updateDocumentForUser(createState(), "user_one", "doc_shared", {
    content: "<p>First edit</p>",
  });

  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const second = updateDocumentForUser(first.state, "user_one", "doc_shared", {
    content: "<p>Second edit</p>",
  });

  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  const document = second.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory?.length, 1);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>Shared content</p>");
});

test("document updates record every persisted content change with each user", () => {
  const state = {
    ...createState(),
    accesses: createState().accesses.map((access) =>
      access.documentId === "doc_shared" && access.userId === "user_two"
        ? { ...access, permission: "can_edit" as const }
        : access,
    ),
  };
  const first = updateDocumentForUser(state, "user_one", "doc_shared", {
    content: "<p>First edit</p>",
  });

  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const second = updateDocumentForUser(first.state, "user_two", "doc_shared", {
    content: "<p>Second edit</p>",
  });

  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }

  const document = second.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory?.length, 1);
  assert.equal(document?.updateHistory?.length, 2);
  assert.equal(document?.updateHistory?.[0]?.userId, "user_two");
  assert.equal(document?.updateHistory?.[0]?.previousContent, "<p>First edit</p>");
  assert.equal(document?.updateHistory?.[0]?.nextContent, "<p>Second edit</p>");
  assert.equal(document?.updateHistory?.[1]?.userId, "user_one");
  assert.equal(document?.updateHistory?.[1]?.previousContent, "<p>Shared content</p>");
  assert.equal(document?.updateHistory?.[1]?.nextContent, "<p>First edit</p>");
});

test("forced document saves keep the previous content restorable inside the merge window", () => {
  const first = updateDocumentForUser(createState(), "user_one", "doc_shared", {
    content: "<p>First edit</p>",
  });

  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  const restored = updateDocumentForUser(first.state, "user_one", "doc_shared", {
    content: "<p>Shared content</p>",
    versionHistoryMode: "force",
  });

  assert.equal(restored.ok, true);
  if (!restored.ok) {
    return;
  }

  const document = restored.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.content, "<p>Shared content</p>");
  assert.equal(document?.versionHistory?.length, 2);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>First edit</p>");
  assert.equal(document?.versionHistory?.[1]?.content, "<p>Shared content</p>");
});

test("restoring a version preserves supported rich text html", () => {
  const richVersionContent = [
    "<h1>Heading</h1>",
    "<p><strong>Bold</strong> <em>Italic</em> <s>Deleted</s> <code>inline()</code> <a href=\"https://example.com\">Link</a></p>",
    "<ul><li><p>Bullet item</p></li></ul>",
    "<ol><li><p>Number item</p></li></ol>",
    "<pre><code>const value = 1;</code></pre>",
    "<table><tbody><tr><th><p>Name</p></th><th><p>Value</p></th></tr><tr><td><p>A</p></td><td><p>1</p></td></tr></tbody></table>",
    "<p><img src=\"/api/media/rich-image.png\" alt=\"Rich image\"></p>",
  ].join("");
  const editedRichContent = [
    "<h2>Edited heading</h2>",
    "<p>Edited body</p>",
    "<table><tbody><tr><td><p>Changed</p></td></tr></tbody></table>",
  ].join("");
  const state = {
    ...createState(),
    documents: createState().documents.map((document) =>
      document.id === "doc_shared"
        ? {
            ...document,
            content: richVersionContent,
          }
        : document,
    ),
  };
  const edited = updateDocumentForUser(state, "user_one", "doc_shared", {
    content: editedRichContent,
  });

  assert.equal(edited.ok, true);
  if (!edited.ok) {
    return;
  }

  const restored = updateDocumentForUser(edited.state, "user_one", "doc_shared", {
    content: richVersionContent,
    versionHistoryMode: "force",
  });

  assert.equal(restored.ok, true);
  if (!restored.ok) {
    return;
  }

  const document = restored.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.content, richVersionContent);
  assert.equal(document?.versionHistory?.length, 2);
  assert.equal(document?.versionHistory?.[0]?.content, editedRichContent);
  assert.equal(document?.versionHistory?.[1]?.content, richVersionContent);
});

test("snapshot saves fix the current content as a version without duplicating it", () => {
  const edited = updateDocumentForUser(createState(), "user_one", "doc_shared", {
    content: "<p>First edit</p>",
  });

  assert.equal(edited.ok, true);
  if (!edited.ok) {
    return;
  }

  const snapshotted = updateDocumentForUser(edited.state, "user_one", "doc_shared", {
    content: "<p>First edit</p>",
    versionHistoryMode: "snapshot",
  });

  assert.equal(snapshotted.ok, true);
  if (!snapshotted.ok) {
    return;
  }

  const duplicated = updateDocumentForUser(snapshotted.state, "user_one", "doc_shared", {
    content: "<p>First edit</p>",
    versionHistoryMode: "snapshot",
  });

  assert.equal(duplicated.ok, true);
  if (!duplicated.ok) {
    return;
  }

  const document = duplicated.state.documents.find((entry) => entry.id === "doc_shared");
  assert.equal(document?.versionHistory?.length, 2);
  assert.equal(document?.versionHistory?.[0]?.content, "<p>First edit</p>");
  assert.equal(document?.versionHistory?.[1]?.content, "<p>Shared content</p>");
});

test("sharing with yourself is rejected", () => {
  const result = shareDocumentWithUser(
    createState(),
    "user_one",
    "doc_shared",
    "one@example.com",
    "can_view",
  );

  assert.deepEqual(result, {
    error: "You cannot share a document with yourself",
    ok: false,
  });
});

test("updating guest permission keeps the document shared", () => {
  const state = createState();
  const previousEditedAt =
    state.documents.find((entry) => entry.id === "doc_shared")?.lastEditedAt ?? "";
  const result = updateDocumentAccessForOwner(
    state,
    "user_one",
    "doc_shared",
    "user_two",
    "can_edit",
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const document = result.state.documents.find((entry) => entry.id === "doc_shared");
  const access = result.state.accesses.find(
    (entry) => entry.documentId === "doc_shared" && entry.userId === "user_two",
  );

  assert.equal(document?.status, "shared");
  assert.notEqual(document?.lastEditedAt, previousEditedAt);
  assert.equal(access?.permission, "can_edit");
});
