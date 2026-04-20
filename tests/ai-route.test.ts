import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/ai/action/route";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
});

test("rejects invalid AI payloads", async () => {
  const response = await POST(
    new Request("http://localhost/api/ai/action", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid AI request",
    ok: false,
  });
});

test("rejects AI requests when environment is not configured", async () => {
  delete process.env.AI_API_KEY;
  delete process.env.ARK_API_KEY;
  delete process.env.AI_BASE_URL;
  delete process.env.AI_MODEL;
  delete process.env.AI_SECONDARY_MODEL;

  const response = await POST(
    new Request("http://localhost/api/ai/action", {
      body: JSON.stringify({
        action: "summarize",
        locale: "en",
        selectedText: "This is a long paragraph that should be summarized.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(payload, {
    error: "AI service is not configured",
    ok: false,
  });
});

test("calls remote responses endpoint when AI environment is configured", async () => {
  process.env.AI_API_KEY = "secret";
  process.env.AI_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  process.env.AI_MODEL = "deepseek-v3-2-251201";
  process.env.AI_SECONDARY_MODEL = "doubao-seed-2-0-pro-260215";

  const requestedUrls: string[] = [];
  const requestedModels: string[] = [];
  global.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
    requestedUrls.push(url);
    requestedModels.push(body.model ?? "");

    assert.equal(init?.method, "POST");
    assert.match(String(init?.headers && (init.headers as Record<string, string>).Authorization), /^Bearer /);

    return new Response(
      JSON.stringify({
        output_text: `Remote answer from ${body.model}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  }) as typeof fetch;

  const response = await POST(
    new Request("http://localhost/api/ai/action", {
      body: JSON.stringify({
        action: "improve_writing",
        locale: "en",
        selectedText: "hello world",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const payload = await response.json();

  assert.deepEqual(requestedUrls, [
    "https://ark.cn-beijing.volces.com/api/v3/responses",
    "https://ark.cn-beijing.volces.com/api/v3/responses",
  ]);
  assert.deepEqual(requestedModels, [
    "deepseek-v3-2-251201",
    "doubao-seed-2-0-pro-260215",
  ]);
  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    candidates: [
      {
        model: "deepseek-v3-2-251201",
        result: "Remote answer from deepseek-v3-2-251201",
      },
      {
        model: "doubao-seed-2-0-pro-260215",
        result: "Remote answer from doubao-seed-2-0-pro-260215",
      },
    ],
    ok: true,
    source: "remote",
    viewOnly: false,
  });
});
