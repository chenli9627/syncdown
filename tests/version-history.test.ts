import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVersionDiffHtml,
  diffVersionText,
  getVersionComparison,
  htmlToVersionText,
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

test("htmlToVersionText represents single image with placeholder", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  const labels = { single: "[Image]", plural: (n: number) => `[${n} Images]` };
  assert.equal(htmlToVersionText('<p><img src="/api/media/test.png"></p>', labels), "[Image]");
});

test("htmlToVersionText represents multiple images with count", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  const labels = { single: "[Image]", plural: (n: number) => `[${n} Images]` };
  assert.equal(
    htmlToVersionText('<p><img src="/api/media/a.png"><img src="/api/media/b.png"></p>', labels),
    "[2 Images]",
  );
});

test("htmlToVersionText combines image placeholder with text", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  const labels = { single: "[Image]", plural: (n: number) => `[${n} Images]` };
  assert.equal(
    htmlToVersionText('<p>Some text <img src="/api/media/test.png"></p>', labels),
    "Some text [Image]",
  );
});

test("htmlToVersionText falls back to default English placeholders without labels", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  assert.equal(
    htmlToVersionText('<p><img src="/api/media/test.png"></p>'),
    "[Image]",
  );
  assert.equal(
    htmlToVersionText('<p><img src="/api/media/a.png"><img src="/api/media/b.png"></p>'),
    "[2 Images]",
  );
});

test("htmlToVersionText extracts text from paragraphs", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  assert.equal(htmlToVersionText("<p>Hello</p><p>World</p>"), "Hello\n\nWorld");
});

test("version diff keeps added blank blocks without added styling", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const html = buildVersionDiffHtml(
    "<p>Hello</p><p><br></p><p>World</p>",
    "<p>Hello</p><p>World</p>",
  );

  assert.match(html, /<p><br><\/p>/);
  assert.doesNotMatch(html, /color:\s*var\(--color-primary\)/);
  assert.doesNotMatch(html, /border-left:\s*3px solid var\(--color-primary\)/);
});

test("version diff marks added text without styling the whole block", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }

  const html = buildVersionDiffHtml(
    "<p>Hello</p><p>New paragraph</p>",
    "<p>Hello</p>",
  );

  assert.match(html, /<p><span style="color: var\(--color-primary\);">New paragraph<\/span><\/p>/);
  assert.doesNotMatch(html, /background-color:\s*color-mix/);
  assert.doesNotMatch(html, /border-left:\s*3px solid var\(--color-primary\)/);
  assert.doesNotMatch(html, /padding-left:\s*12px/);
});

test("htmlToVersionText returns empty string for empty content", () => {
  if (typeof DOMParser === "undefined") {
    return;
  }
  assert.equal(htmlToVersionText(""), "");
  assert.equal(htmlToVersionText("   "), "");
});
