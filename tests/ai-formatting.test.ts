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

test("toAiInsertHtml decodes common escaped html entities as text", () => {
  const html = toAiInsertHtml("Tom &amp; Jerry &copy; &reg; &euro; &lt;tag&gt; &quot;quoted&quot;");

  assert.equal(html, "<p>Tom &amp; Jerry \u00a9 \u00ae \u20ac &lt;tag&gt; &quot;quoted&quot;</p>");
});

test("toAiInsertHtml converts markdown links inside tables", () => {
  const html = toAiInsertHtml(`| Title | Link |
| --- | --- |
| Hacker News | [Open](https://news.ycombinator.com/news) |
| Item | https://news.ycombinator.com/item?id=1 |`);

  assert.match(html, /<table>/);
  assert.match(html, /<a href="https:\/\/news\.ycombinator\.com\/news">Open<\/a>/);
  assert.match(
    html,
    /<a href="https:\/\/news\.ycombinator\.com\/item\?id=1">https:\/\/news\.ycombinator\.com\/item\?id=1<\/a>/,
  );
});

test("toAiInsertHtml converts markdown links and strikethrough", () => {
  const html = toAiInsertHtml("[北京文旅](https://example.com)\n\n~~旧计划~~");

  assert.match(html, /<a href="https:\/\/example\.com">北京文旅<\/a>/);
  assert.match(html, /<(?:s|del)>旧计划<\/(?:s|del)>/);
});

test("insertAiResultBelow appends an empty paragraph after the inserted content", () => {
  const html = insertAiResultBelow("<p>Inserted</p>");

  assert.equal(html, "<p>Inserted</p><p></p>");
});
