import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPublicUrlText } from "../src/lib/server/ai-web-fetch";

test("fetchPublicUrlText extracts readable text from public html", async () => {
  const result = await fetchPublicUrlText("https://example.com/page#section", async (input) => {
    assert.equal(input, "https://example.com/page");

    return new Response(
      "<html><head><title>Example</title><style>.x{}</style></head><body><h1>Hello</h1><p>World&nbsp;Text</p><script>ignore()</script></body></html>",
      {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 200,
      },
    );
  }, async () => [{ address: "93.184.216.34", family: 4 }]);

  assert.equal(result.error, undefined);
  assert.equal(result.title, "Example");
  assert.equal(result.text, "Hello\n World Text");
});

test("fetchPublicUrlText rejects non-public and non-http urls", async () => {
  assert.equal((await fetchPublicUrlText("file:///etc/passwd")).error, "Only http and https URLs are allowed.");
  assert.equal((await fetchPublicUrlText("http://localhost:3000")).error, "This host is not allowed.");
  assert.equal((await fetchPublicUrlText("http://127.0.0.1:3000")).error, "This host is not allowed.");
  assert.equal((await fetchPublicUrlText("http://192.168.1.1")).error, "This host is not allowed.");
});

test("fetchPublicUrlText reports redirects without following them", async () => {
  const result = await fetchPublicUrlText(
    "https://example.com/redirect",
    async () =>
      new Response(null, {
        headers: { location: "https://example.com/next" },
        status: 302,
      }),
    async () => [{ address: "93.184.216.34", family: 4 }],
  );

  assert.match(result.error ?? "", /redirects to https:\/\/example.com\/next/);
});

test("fetchPublicUrlText rejects hosts that resolve to private addresses", async () => {
  const result = await fetchPublicUrlText(
    "https://internal.example.com",
    async () => {
      throw new Error("fetch should not run");
    },
    async () => [{ address: "10.0.0.2", family: 4 }],
  );

  assert.equal(result.error, "This host resolves to a private or local address.");
});
