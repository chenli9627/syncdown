import type {
  AiChatDocumentBlock,
  AiChatMessage,
  AiChatResponseMode,
} from "@/features/app-state/types";
import { resolveAiChatDocumentInsertTarget } from "@/features/editor/lib/ai-chat-document-insert-target";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  type AiChatHistoryArtifact,
  findAiChatHistoryArtifact,
} from "@/features/editor/lib/ai-chat-history-artifacts";

export function buildDeterministicAiHistoryEditPayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
  messages: AiChatMessage[],
  responseMode: AiChatResponseMode | null,
): AiDocumentEditPayload | null {
  const artifact = findAiChatHistoryArtifact(messages, prompt, responseMode);

  if (!artifact) {
    return null;
  }

  const content = formatHistoryArtifactContent(artifact, responseMode);
  const target = resolveAiChatDocumentInsertTarget(prompt, documentBlocks);

  if (!content || !target) {
    return null;
  }

  return {
    operations: [
      {
        blockId: target.blockId,
        content,
        type: target.operationType,
      },
    ],
    summary: buildHistoryInsertSummary(artifact, responseMode, target.locationLabel),
  };
}

function formatHistoryArtifactContent(
  artifact: AiChatHistoryArtifact,
  responseMode: AiChatResponseMode | null,
) {
  if (responseMode === "table") {
    return toTableContent(artifact);
  }

  if (responseMode === "list" || responseMode === "key_points") {
    return toListContent(artifact);
  }

  return artifact.content.trim();
}

function toTableContent(artifact: AiChatHistoryArtifact) {
  if (artifact.kind === "table") {
    return artifact.content.trim();
  }

  const listItems = toListItems(artifact);

  if (!listItems.length) {
    return artifact.content.trim();
  }

  return [
    "| 项目 | 内容 |",
    "| --- | --- |",
    ...listItems.map((item, index) => `| ${index + 1} | ${escapeTableCell(item)} |`),
  ].join("\n");
}

function toListContent(artifact: AiChatHistoryArtifact) {
  if (artifact.kind === "list" || artifact.kind === "key_points") {
    return artifact.content.trim();
  }

  const listItems = toListItems(artifact);
  return listItems.length ? listItems.map((item) => `- ${item}`).join("\n") : artifact.content.trim();
}

function toListItems(artifact: AiChatHistoryArtifact) {
  if (artifact.kind === "table") {
    const table = parseMarkdownTable(artifact.content);

    if (!table) {
      return [];
    }

    return table.rows.map((row) =>
      row
        .map((cell, index) => {
          const header = table.headers[index] ?? `列${index + 1}`;
          return `${header}：${cell}`;
        })
        .join("；"),
    );
  }

  if (artifact.kind === "list" || artifact.kind === "key_points") {
    return artifact.content
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+|- \[[ xX]\]\s+)/u, "").trim())
      .filter(Boolean);
  }

  return artifact.content
    .split(/[\n。！？!?]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMarkdownTable(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) {
    return null;
  }

  const headers = splitMarkdownTableRow(lines[0]!);
  const rows = lines.slice(2).map(splitMarkdownTableRow).filter((row) => row.length);

  return headers.length && rows.length ? { headers, rows } : null;
}

function splitMarkdownTableRow(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, array) => cell.length > 0 || array.length > 1);
}

function escapeTableCell(value: string) {
  return value.replaceAll("|", "\\|").trim();
}

function buildHistoryInsertSummary(
  artifact: AiChatHistoryArtifact,
  responseMode: AiChatResponseMode | null,
  locationLabel: string,
) {
  const sourceLabel = describeArtifactKind(artifact.kind);

  if (responseMode === "table" && artifact.kind !== "table") {
    return `已将前面的${sourceLabel}整理为表格，并插入到${locationLabel}。`;
  }

  if ((responseMode === "list" || responseMode === "key_points") && artifact.kind !== "list") {
    return `已将前面的${sourceLabel}整理为列表，并插入到${locationLabel}。`;
  }

  return `已将前面的${sourceLabel}插入到${locationLabel}。`;
}

function describeArtifactKind(kind: AiChatHistoryArtifact["kind"]) {
  if (kind === "table") {
    return "表格";
  }

  if (kind === "list" || kind === "key_points") {
    return "列表";
  }

  return "内容";
}
