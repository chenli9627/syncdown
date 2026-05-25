import type { AiChatDocumentBlock } from "@/features/app-state/types";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";
import {
  findLastBlocksOfTypes,
  getSectionBlockIds,
} from "@/features/editor/lib/ai-chat-deterministic-document-edit-delete-helpers";
import { parseTableIndex } from "@/features/editor/lib/ai-chat-table-matrix";

export function buildCountedLastBlockDeletePayload(
  prompt: string,
  documentBlocks: AiChatDocumentBlock[],
): AiDocumentEditPayload | null {
  const match = prompt.match(
    /(?:删除|移除|删掉|去掉)(?:最后|末尾)([0-9一二三四五六七八九十两]{1,4})(段落?|个?标题|个?列表|个?表格|节|章节|小节|部分)/u,
  );
  const count = parseTableIndex(match?.[1]);
  const kind = match?.[2] ?? "";

  if (!count || count <= 1) {
    return null;
  }

  if (/(?:节|章节|小节|部分)/u.test(kind)) {
    const headingBlocks = findLastBlocksOfTypes(documentBlocks, ["heading"], count);
    const blockIds = [...new Set(headingBlocks.flatMap((block) => getSectionBlockIds(documentBlocks, block.id)))];
    return headingBlocks.length === count && blockIds.length
      ? {
          operations: blockIds.map((blockId) => ({ blockId, type: "delete_block" as const })),
          summary: `已删除最后${count}节。`,
        }
      : null;
  }

  const resolved = resolveCountedLastBlockKind(kind);
  const blocks = resolved ? findLastBlocksOfTypes(documentBlocks, resolved.types, count) : [];

  return blocks.length === count
    ? {
        operations: blocks.map((block) => ({ blockId: block.id, type: "delete_block" as const })),
        summary: `已删除最后${count}${resolved?.label ?? "个块"}。`,
      }
    : null;
}

function resolveCountedLastBlockKind(kind: string) {
  if (/段落?/u.test(kind)) {
    return { label: "段", types: ["paragraph"] };
  }

  if (/标题/u.test(kind)) {
    return { label: "个标题", types: ["heading"] };
  }

  if (/列表/u.test(kind)) {
    return { label: "个列表", types: ["bulletList", "orderedList", "taskList"] };
  }

  if (/表格/u.test(kind)) {
    return { label: "个表格", types: ["table"] };
  }

  return null;
}
