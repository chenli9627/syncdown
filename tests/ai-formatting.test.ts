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

test("toAiInsertHtml converts level six markdown headings", () => {
  const html = toAiInsertHtml("###### Details");

  assert.match(html, /<h6>Details<\/h6>/);
});

test("toAiInsertHtml preserves raw html responses", () => {
  const html = toAiInsertHtml("<blockquote><p>Explained</p></blockquote>");

  assert.equal(html, "<blockquote><p>Explained</p></blockquote>");
});

test("toAiInsertHtml treats unknown angle-bracket text as plain text", () => {
  const html = toAiInsertHtml("<article>Copied from a fetched page</article>");

  assert.equal(html, "<p>&lt;article&gt;Copied from a fetched page&lt;/article&gt;</p>");
});

test("toAiInsertHtml rejects unsafe html-like AI responses", () => {
  const html = toAiInsertHtml("<button>Apply</button>");

  assert.equal(html, "<p>&lt;button&gt;Apply&lt;/button&gt;</p>");
});

test("insertAiResultBelow appends an empty paragraph after the inserted content", () => {
  const html = insertAiResultBelow("<p>Inserted</p>");

  assert.equal(html, "<p>Inserted</p><p></p>");
});
