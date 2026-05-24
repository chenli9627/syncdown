import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStandaloneMarkdownAssets,
  validateSupportedMarkdown,
} from "../src/features/editor/lib/markdown";

test("accepts supported markdown constructs", () => {
  const result = validateSupportedMarkdown(`# Title

Plain paragraph

- [ ] Todo item

[link](https://example.com)

~~old~~

> Quote

\`\`\`ts
const value = 1
\`\`\`
`);

  assert.equal(result.ok, true);
});

test("accepts nested lists", () => {
  const result = validateSupportedMarkdown(`- parent
  - child`);

  assert.deepEqual(result, {
    ok: true,
  });
});

test("rejects raw html blocks", () => {
  const result = validateSupportedMarkdown("<details><summary>Toggle</summary></details>");

  assert.deepEqual(result, {
    error: "Raw HTML blocks are not supported in markdown import",
    ok: false,
  });
});

test("rejects local image references in standalone markdown files", () => {
  const result = validateStandaloneMarkdownAssets(`![Local asset](assets/example.png)`);

  assert.deepEqual(result, {
    error:
      "Markdown file contains local image references and must be imported as .zip: assets/example.png",
    ok: false,
  });
});

test("allows remote image references in standalone markdown files", () => {
  const result = validateStandaloneMarkdownAssets(
    `![Remote image](https://example.com/example.png)`,
  );

  assert.deepEqual(result, {
    ok: true,
  });
});
