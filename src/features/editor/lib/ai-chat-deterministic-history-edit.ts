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
  if (!isHistoryArtifactReusePrompt(prompt, responseMode)) {
    return null;
  }

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

function isHistoryArtifactReusePrompt(
  prompt: string,
  responseMode: AiChatResponseMode | null,
) {
  const compactPrompt = prompt.toLowerCase().replace(/\s+/g, "");
  const lowerPrompt = prompt.toLowerCase();
  const referencesPreviousContent =
    /(?:刚才|上面|前面|之前|上一条|上一个|前一个|那个|这份|这段|这条|该).{0,24}(?:表格|列表|清单|回答|结果|内容|推荐|说明|总结|文字)/u.test(
      compactPrompt,
    ) ||
    /(?:表格|列表|清单|回答|结果|内容|推荐|说明|总结|文字).{0,24}(?:刚才|上面|前面|之前|上一条|上一个|前一个|那个|这份|这段|这条|该)/u.test(
      compactPrompt,
    ) ||
    /\b(?:previous|earlier|above|last|prior|that|this)\b[\s\S]{0,40}\b(?:table|list|answer|response|result|content|summary|text)\b/i.test(
      lowerPrompt,
    );
  const insertsOrTransformsPreviousContent =
    /(?:添加|加入|插入|写入|放到|放入|放进|放在|加到|整理|转成|转换成|做成|改成|变成).{0,64}(?:文档|正文|页面|表格|列表|清单)/u.test(
      compactPrompt,
    ) ||
    /\b(?:add|insert|append|put|place|format|organize|convert|turn|make)\b[\s\S]{0,120}\b(?:document|doc|page|table|list)\b/i.test(
      lowerPrompt,
    );
  const explicitResponseModeReuse =
    responseMode != null &&
    /(?:整理|转成|转换成|做成|改成|变成).{0,24}(?:表格|列表|清单|要点)/u.test(compactPrompt);

  return (referencesPreviousContent && insertsOrTransformsPreviousContent) || explicitResponseModeReuse;
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
