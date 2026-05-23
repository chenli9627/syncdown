import test from "node:test";
import assert from "node:assert/strict";
import { toAiInsertHtml, insertAiResultBelow } from "../src/features/editor/lib/ai";

test("toAiInsertHtml converts markdown responses into editor html", () => {
  const html = toAiInsertHtml(`## Summary

- one
- two

**bold**
`);

  assert.match(html, /<h2>Summary<\/h2>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<strong>bold<\/strong>/);
});

test("toAiInsertHtml converts level five markdown headings", () => {
  const html = toAiInsertHtml("##### Details");

  assert.match(html, /<h5>Details<\/h5>/);
});

test("toAiInsertHtml preserves raw html responses", () => {
  const html = toAiInsertHtml("<blockquote><p>Explained</p></blockquote>");

  assert.equal(html, "<blockquote><p>Explained</p></blockquote>");
});

test("insertAiResultBelow appends an empty paragraph after the inserted content", () => {
  const html = insertAiResultBelow("<p>Inserted</p>");

  assert.equal(html, "<p>Inserted</p><p></p>");
});
