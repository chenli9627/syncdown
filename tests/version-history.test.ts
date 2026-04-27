import test from "node:test";
import assert from "node:assert/strict";
import {
  diffVersionText,
  getVersionComparison,
} from "../src/features/editor/lib/version-history";

test("diffs chinese text at character granularity", () => {
  const parts = diffVersionText("这是我的建议哦", "这是我的真诚建议哦");

  assert.deepEqual(parts, [
    { text: "这是我的", type: "unchanged" },
    { text: "真诚", type: "added" },
    { text: "建议哦", type: "unchanged" },
  ]);
});

test("marks removed text separately from unchanged text", () => {
  const parts = diffVersionText("This is old advice.", "This is advice.");

  assert.deepEqual(parts, [
    { text: "This is ", type: "unchanged" },
    { text: "old ", type: "removed" },
    { text: "advice.", type: "unchanged" },
  ]);
});

test("compares a selected version against the previous older version", () => {
  const document = {
    content: "<p>current</p>",
    versionHistory: [
      {
        content: "<p>version 2</p>",
        createdAt: "2026-04-28T00:20:00.000Z",
        id: "version_2",
        title: "Doc",
        userId: "user_one",
      },
      {
        content: "<p>version 1</p>",
        createdAt: "2026-04-28T00:10:00.000Z",
        id: "version_1",
        title: "Doc",
        userId: "user_one",
      },
    ],
  };

  assert.deepEqual(
    getVersionComparison(document, document.versionHistory[0] ?? null),
    {
      currentContent: "<p>version 2</p>",
      previousContent: "<p>version 1</p>",
    },
  );
  assert.deepEqual(
    getVersionComparison(document, document.versionHistory[1] ?? null),
    {
      currentContent: "<p>version 1</p>",
      previousContent: null,
    },
  );
});

test("compares a current snapshot against the previous fixed version", () => {
  const document = {
    content: "<p>current</p>",
    versionHistory: [
      {
        content: "<p>current</p>",
        createdAt: "2026-04-28T00:20:00.000Z",
        id: "version_2",
        title: "Doc",
        userId: "user_one",
      },
      {
        content: "<p>version 1</p>",
        createdAt: "2026-04-28T00:10:00.000Z",
        id: "version_1",
        title: "Doc",
        userId: "user_one",
      },
    ],
  };

  assert.deepEqual(
    getVersionComparison(document, document.versionHistory[0] ?? null),
    {
      currentContent: "<p>current</p>",
      previousContent: "<p>version 1</p>",
    },
  );
});

test("does not compare the first snapshot against empty content", () => {
  const document = {
    content: "<p>first version</p>",
    versionHistory: [
      {
        content: "<p>first version</p>",
        createdAt: "2026-04-28T00:10:00.000Z",
        id: "version_1",
        title: "Doc",
        userId: "user_one",
      },
    ],
  };

  assert.deepEqual(
    getVersionComparison(document, document.versionHistory[0] ?? null),
    {
      currentContent: "<p>first version</p>",
      previousContent: null,
    },
  );
});

test("diffs empty previous text as fully added", () => {
  assert.deepEqual(diffVersionText("", "first version"), [
    { text: "first version", type: "added" },
  ]);
});
