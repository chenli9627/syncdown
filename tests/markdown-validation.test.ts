import test from "node:test";
import assert from "node:assert/strict";
import { validateSupportedMarkdown } from "../src/features/editor/lib/markdown";

test("accepts supported markdown constructs", () => {
  const result = validateSupportedMarkdown(`# Title

Plain paragraph

- [ ] Todo item

> Quote

\`\`\`ts
const value = 1
\`\`\`
`);

  assert.equal(result.ok, true);
});

test("rejects markdown links", () => {
  const result = validateSupportedMarkdown("[link](https://example.com)");

  assert.deepEqual(result, {
    error: "Markdown links are not supported yet",
    ok: false,
  });
});

test("rejects nested lists", () => {
  const result = validateSupportedMarkdown(`- parent
  - child`);

  assert.deepEqual(result, {
    error: "Nested markdown lists are not supported yet",
    ok: false,
  });
});

test("rejects raw html blocks", () => {
  const result = validateSupportedMarkdown("<details><summary>Toggle</summary></details>");

  assert.deepEqual(result, {
    error: "Raw HTML blocks are not supported in markdown import",
    ok: false,
  });
});
