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

test("defaults to the primary model when AI environment is configured", async () => {
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
  ]);
  assert.deepEqual(requestedModels, [
    "deepseek-v3-2-251201",
  ]);
  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    candidates: [
      {
        model: "deepseek-v3-2-251201",
        result: "Remote answer from deepseek-v3-2-251201",
      },
    ],
    ok: true,
    source: "remote",
    viewOnly: false,
  });
});

test("requests only the primary model when one AI result is selected", async () => {
  process.env.AI_API_KEY = "secret";
  process.env.AI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  process.env.AI_MODEL = "qwen3.6-flash";
  process.env.AI_SECONDARY_MODEL = "deepseek-v4-flash";

  const requestedModels: string[] = [];
  global.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
    requestedModels.push(body.model ?? "");

    return new Response(
      JSON.stringify({
        output_text: `Only answer from ${body.model}`,
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
        candidateCount: 1,
        locale: "en",
        selectedText: "hello world",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const payload = await response.json();

  assert.deepEqual(requestedModels, ["qwen3.6-flash"]);
  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    candidates: [
      {
        model: "qwen3.6-flash",
        result: "Only answer from qwen3.6-flash",
      },
    ],
    ok: true,
    source: "remote",
    viewOnly: false,
  });
});

test("falls back to chat completions when responses endpoint does not return content", async () => {
  process.env.AI_API_KEY = "secret";
  process.env.AI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  process.env.AI_MODEL = "qwen3.6-flash";
  process.env.AI_SECONDARY_MODEL = "deepseek-v4-flash";

  const requestedUrls: string[] = [];
  const requestedModels: string[] = [];
  global.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
    requestedUrls.push(url);
    requestedModels.push(body.model ?? "");

    if (url.endsWith("/responses") && body.model === "qwen3.6-flash") {
      return new Response(
        JSON.stringify({
          output_text: "Qwen response answer",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    if (url.endsWith("/responses")) {
      return new Response(
        JSON.stringify({
          code: "InvalidParameter",
          message: "Unsupported model",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "DeepSeek chat answer",
            },
          },
        ],
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
        action: "summarize",
        candidateCount: 2,
        locale: "zh",
        selectedText: "需要总结的文字",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const payload = await response.json();

  assert.deepEqual(requestedUrls, [
    "https://dashscope.aliyuncs.com/compatible-mode/v1/responses",
    "https://dashscope.aliyuncs.com/compatible-mode/v1/responses",
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  ]);
  assert.deepEqual(requestedModels, [
    "qwen3.6-flash",
    "deepseek-v4-flash",
    "deepseek-v4-flash",
  ]);
  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    candidates: [
      {
        model: "qwen3.6-flash",
        result: "Qwen response answer",
      },
      {
        model: "deepseek-v4-flash",
        result: "DeepSeek chat answer",
      },
    ],
    ok: true,
    source: "remote",
    viewOnly: true,
  });
});
