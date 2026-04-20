import { NextResponse } from "next/server";
import {
  buildAiUserPrompt,
  getAiViewOnly,
  type AiActionKind,
  type AiRequestPayload,
} from "@/features/editor/lib/ai";
import type { Locale } from "@/lib/i18n/messages";

type OpenAiCompatibleResponse = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (AiRequestPayload & { action?: AiActionKind; locale?: Locale; selectedText?: string })
    | null;

  if (!body?.action || !body?.selectedText || !body?.locale) {
    return NextResponse.json(
      { error: "Invalid AI request", ok: false },
      { status: 400 },
    );
  }

  const selectedText = body.selectedText.trim();

  if (!selectedText) {
    return NextResponse.json(
      { error: "Selected text is empty", ok: false },
      { status: 400 },
    );
  }

  const viewOnly = getAiViewOnly(body.action);

  const apiKey = process.env.AI_API_KEY?.trim() || process.env.ARK_API_KEY?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const model = process.env.AI_MODEL?.trim();
  const secondaryModel = process.env.AI_SECONDARY_MODEL?.trim();

  if (!apiKey || !baseUrl || !model || !secondaryModel) {
    return NextResponse.json(
      { error: "AI service is not configured", ok: false },
      { status: 503 },
    );
  }

  try {
    const models = Array.from(
      new Set(
        [
          model,
          secondaryModel,
        ].filter((candidate): candidate is string => Boolean(candidate)),
      ),
    );
    const candidates = (
      await Promise.all(
        models.map((candidateModel) =>
          requestAiCandidate({
            apiKey,
            baseUrl,
            locale: body.locale,
            model: candidateModel,
            payload: body,
          }),
        ),
      )
    ).filter((candidate): candidate is { model: string; result: string } => candidate !== null);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "AI request failed", ok: false },
        { status: 502 },
      );
    }

    return NextResponse.json({
      candidates,
      ok: true,
      source: "remote",
      viewOnly,
    });
  } catch {
    return NextResponse.json(
      { error: "AI request failed", ok: false },
      { status: 502 },
    );
  }
}

async function requestAiCandidate({
  apiKey,
  baseUrl,
  locale,
  model,
  payload,
}: {
  apiKey: string;
  baseUrl: string;
  locale: Locale;
  model: string;
  payload: AiRequestPayload;
}) {
  try {
    const response = await fetch(resolveResponsesEndpoint(baseUrl), {
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text:
                  locale === "zh"
                    ? "你是 Syncdown 的写作助手。只返回最终结果，不要加寒暄，不要用 markdown 代码块包裹。"
                    : "You are Syncdown's writing assistant. Return only the final result, no preamble, and do not wrap the answer in markdown code fences.",
                type: "input_text",
              },
            ],
            role: "system",
          },
          {
            content: [
              {
                text: buildAiUserPrompt(payload),
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        model,
        temperature: 0.3,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenAiCompatibleResponse;
    const content = extractResponseText(data).trim();

    if (!content) {
      return null;
    }

    return {
      model,
      result: content,
    };
  } catch {
    return null;
  }
}

function extractResponseText(data: OpenAiCompatibleResponse) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? "")
    .join("")
    .trim();

  if (outputText) {
    return outputText;
  }

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item.type === "text" ? item.text ?? "" : item.text ?? ""))
      .join("");
  }

  return "";
}

function resolveResponsesEndpoint(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");

  if (trimmed.endsWith("/responses")) {
    return trimmed;
  }

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "/responses");
  }

  return `${trimmed}/responses`;
}
