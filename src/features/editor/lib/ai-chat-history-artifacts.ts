import type { AiChatMessage, AiChatResponseMode } from "@/features/app-state/types";

export type AiChatHistoryArtifact = {
  content: string;
  kind: "key_points" | "list" | "paragraph" | "table";
  messageId: string;
  sourceText: string;
};

export function findAiChatHistoryArtifact(
  messages: AiChatMessage[],
  prompt: string,
  responseMode: AiChatResponseMode | null,
): AiChatHistoryArtifact | null {
  const desiredKind = resolveDesiredArtifactKind(prompt, responseMode);
  const promptTokens = tokenizeArtifactText(prompt);
  let bestCandidate: { artifact: AiChatHistoryArtifact; score: number } | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role !== "assistant" || message.metadata?.documentAction) {
      continue;
    }

    const sourceText = getMessageText(message);

    if (!sourceText) {
      continue;
    }

    for (const artifact of extractAiChatHistoryArtifacts(message.id, sourceText)) {
      const score = scoreHistoryArtifactCandidate(
        artifact,
        desiredKind,
        prompt,
        promptTokens,
        index,
      );

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { artifact, score };
      }
    }
  }

  return bestCandidate?.score && bestCandidate.score > 0 ? bestCandidate.artifact : null;
}

function extractAiChatHistoryArtifacts(messageId: string, sourceText: string) {
  const normalizedText = sourceText.trim();
  const tables = extractMarkdownTables(normalizedText).map((content) => ({
    content,
    kind: "table" as const,
    messageId,
    sourceText: normalizedText,
  }));
  const lists = extractMarkdownLists(normalizedText).map((content) => ({
    content,
    kind: "list" as const,
    messageId,
    sourceText: normalizedText,
  }));

  if (tables.length || lists.length) {
    return [...tables, ...lists];
  }

  return normalizedText
    ? [
        {
          content: normalizedText,
          kind: "paragraph" as const,
          messageId,
          sourceText: normalizedText,
        },
      ]
    : [];
}

function resolveDesiredArtifactKind(prompt: string, responseMode: AiChatResponseMode | null) {
  if (responseMode === "table" || /(?:表格|表\b|markdown table|tabular)/iu.test(prompt)) {
    return "table";
  }

  if (responseMode === "list" || responseMode === "key_points" || /(?:列表|清单|条目|要点|重点|关键点|\blist\b|\bbullets?\b)/iu.test(prompt)) {
    return "list";
  }

  return null;
}

function scoreHistoryArtifactCandidate(
  artifact: AiChatHistoryArtifact,
  desiredKind: AiChatHistoryArtifact["kind"] | null,
  prompt: string,
  promptTokens: string[],
  recencyIndex: number,
) {
  const artifactTokens = tokenizeArtifactText(`${artifact.sourceText}\n${artifact.content}`);
  const overlapCount = promptTokens.filter((token) => artifactTokens.includes(token)).length;
  let score = recencyIndex + Math.min(overlapCount, 8) * 6;

  if (desiredKind === artifact.kind) {
    score += 40;
  } else if (
    desiredKind === "list" &&
    (artifact.kind === "paragraph" || artifact.kind === "key_points")
  ) {
    score += 16;
  } else if (
    desiredKind === "table" &&
    (artifact.kind === "list" || artifact.kind === "paragraph")
  ) {
    score += 12;
  }

  if (/(?:刚才|上面|前面|之前|上一条|上一个|那个|这个|该)/u.test(prompt)) {
    score += 8;
  }

  return score;
}

function extractMarkdownTables(text: string) {
  const lines = text.split(/\r?\n/);
  const tables: string[] = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isMarkdownTableRow(lines[index] ?? "") || !isMarkdownTableSeparator(lines[index + 1] ?? "")) {
      continue;
    }

    const tableLines = [lines[index]!, lines[index + 1]!];
    index += 2;

    while (index < lines.length && isMarkdownTableRow(lines[index] ?? "")) {
      tableLines.push(lines[index]!);
      index += 1;
    }

    index -= 1;
    tables.push(tableLines.join("\n").trim());
  }

  return tables;
}

function extractMarkdownLists(text: string) {
  const lines = text.split(/\r?\n/);
  const lists: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isMarkdownListLine(lines[index] ?? "")) {
      continue;
    }

    const listLines = [lines[index]!.trimEnd()];
    index += 1;

    while (index < lines.length && isMarkdownListContinuation(lines[index] ?? "")) {
      listLines.push(lines[index]!.trimEnd());
      index += 1;
    }

    index -= 1;

    if (listLines.length) {
      lists.push(listLines.join("\n").trim());
    }
  }

  return lists;
}

function isMarkdownTableRow(line: string) {
  return /\|/.test(line) && line.split("|").length >= 3;
}

function isMarkdownTableSeparator(line: string) {
  return /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/u.test(line);
}

function isMarkdownListLine(line: string) {
  return /^\s*(?:[-*+]\s+|\d+\.\s+|- \[[ xX]\]\s+)/u.test(line);
}

function isMarkdownListContinuation(line: string) {
  return !line.trim() || isMarkdownListLine(line) || /^\s{2,}\S/u.test(line);
}

function tokenizeArtifactText(text: string) {
  const tokens = new Set<string>();
  const normalized = text.toLowerCase();
  const englishWords = normalized.match(/[a-z0-9][a-z0-9._-]{2,}/g) ?? [];

  for (const word of englishWords) {
    if (!ENGLISH_STOP_WORDS.has(word)) {
      tokens.add(word);
    }
  }

  const chineseChunks = normalized.match(/[\u4e00-\u9fff]{2,}/gu) ?? [];

  for (const chunk of chineseChunks) {
    if (CHINESE_STOP_WORDS.has(chunk)) {
      continue;
    }

    tokens.add(chunk);

    for (let index = 0; index < chunk.length - 1; index += 1) {
      const bigram = chunk.slice(index, index + 2);

      if (!CHINESE_STOP_WORDS.has(bigram)) {
        tokens.add(bigram);
      }
    }
  }

  return [...tokens];
}

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

const CHINESE_STOP_WORDS = new Set([
  "一下",
  "一个",
  "一份",
  "内容",
  "可以",
  "告诉",
  "文档",
  "添加",
  "插入",
  "加入",
  "放到",
  "放入",
  "放进",
  "整理",
  "这个",
  "那个",
  "前面",
  "上面",
  "之前",
  "刚才",
]);

const ENGLISH_STOP_WORDS = new Set([
  "add",
  "append",
  "content",
  "document",
  "insert",
  "into",
  "list",
  "place",
  "previous",
  "table",
  "that",
  "this",
  "those",
  "these",
  "with",
]);
