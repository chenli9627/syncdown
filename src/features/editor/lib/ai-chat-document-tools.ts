import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { toExecutableOperations } from "@/features/editor/lib/ai-chat-document-edit-converter";
import { sanitizeAiInsertedContent } from "@/features/editor/lib/ai-chat-output-guard";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
import type {
  AiDocumentEditOperation,
  AiDocumentEditPayload,
} from "@/features/editor/lib/ai-chat-document-edit-types";
import { verifyAiDocumentEditOperations } from "@/features/editor/lib/ai-chat-document-edit-verification";

export type AiDocumentEditApplyResult = {
  appliedCount: number;
  failedVerificationCount: number;
  requestedCount: number;
  verified: boolean;
};

export function getAiDocumentBlocks(editor: Editor | null): AiChatDocumentBlock[] {
  return getLocalAiDocumentBlocks(editor).map(toAiDocumentBlock);
}

export function applyAiDocumentEditToolResponse(editor: Editor | null, responseText: string) {
  return applyAiDocumentEditToolResponseWithVerification(editor, responseText).appliedCount;
}

export function applyAiDocumentEditToolResponseWithVerification(
  editor: Editor | null,
  responseText: string,
): AiDocumentEditApplyResult {
  const emptyResult: AiDocumentEditApplyResult = {
    appliedCount: 0,
    failedVerificationCount: 0,
    requestedCount: 0,
    verified: false,
  };

  if (!editor) {
    return emptyResult;
  }

  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return emptyResult;
  }

  const payloadOperations = normalizeDependentTableInsertOperations(payload.operations);
  const blocks = getLocalAiDocumentBlocks(editor);
  const beforeSnapshot = editor.state.doc.toJSON();
  const operations = payloadOperations
    .flatMap((operation, index) => toExecutableOperations(operation, blocks, index))
    .sort((a, b) => b.position - a.position || b.index - a.index);

  let appliedCount = 0;

  operations.forEach((operation) => {
    const before = getEditorDocumentSnapshot(editor);

    try {
      applyExecutableOperation(editor, operation);
    } catch {
      return;
    }

    if (getEditorDocumentSnapshot(editor) !== before) {
      appliedCount += 1;
    }
  });

  const verification = verifyAiDocumentEditOperations(
    payloadOperations,
    blocks,
    getLocalAiDocumentBlocks(editor),
  );

  if (!verification.verified) {
    restoreEditorDocumentSnapshot(editor, beforeSnapshot);

    return {
      appliedCount: 0,
      failedVerificationCount: verification.failedCount,
      requestedCount: payloadOperations.length,
      verified: false,
    };
  }

  return {
    appliedCount,
    failedVerificationCount: verification.failedCount,
    requestedCount: payloadOperations.length,
    verified: verification.verified,
  };
}

export function getAiDocumentEditToolSummary(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload) {
    return null;
  }

  const summary = payload.summary?.trim();
  const operations = payload.operations ?? [];

  if (!operations.length) {
    if (!summary) {
      return "模型没有返回可应用的文档操作，未修改文档。";
    }

    return isNonAppliedEditSummary(summary)
      ? summary
      : "模型没有返回可应用的文档操作，未修改文档。";
  }

  return summary || "Document edit operations generated.";
}

export function getAiDocumentEditToolOperationCount(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  return payload ? normalizeDependentTableInsertOperations(payload.operations).length : 0;
}

export function getAiDocumentEditToolPreviewLines(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return [];
  }

  return normalizeDependentTableInsertOperations(payload.operations)
    .map((operation) => toPreviewLine(operation))
    .filter((line): line is string => Boolean(line));
}

function parseAiDocumentEditPayload(responseText: string): AiDocumentEditPayload | null {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as AiDocumentEditPayload;
    return Array.isArray(parsed.operations)
      ? {
          ...parsed,
          operations: parsed.operations.map(sanitizeAiDocumentEditOperation),
        }
      : null;
  } catch {
    return null;
  }
}

function extractJsonObject(responseText: string) {
  const trimmed = responseText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  return start >= 0 && end > start ? candidate.slice(start, end + 1) : null;
}

function getEditorDocumentSnapshot(editor: Editor) {
  return JSON.stringify(editor.state.doc.toJSON());
}

function restoreEditorDocumentSnapshot(editor: Editor, snapshot: unknown) {
  const documentNode = editor.state.schema.nodeFromJSON(snapshot);
  const transaction = editor.state.tr.replaceWith(
    0,
    editor.state.doc.content.size,
    documentNode.content,
  );
  editor.view.dispatch(transaction);
  editor.commands.focus();
}

function normalizeDependentTableInsertOperations(operations: AiDocumentEditOperation[] = []) {
  const consumedUpdateIndexes = new Set<number>();

  return operations.flatMap((operation, index) => {
    if (consumedUpdateIndexes.has(index)) {
      return [];
    }

    const dependentUpdateIndex = findDependentTableCellUpdateIndex(operations, operation, index);

    if (dependentUpdateIndex < 0) {
      return [operation];
    }

    consumedUpdateIndexes.add(dependentUpdateIndex);

    return [
      {
        ...operation,
        content: operations[dependentUpdateIndex]?.content,
      },
    ];
  });
}

function sanitizeAiDocumentEditOperation(operation: AiDocumentEditOperation): AiDocumentEditOperation {
  if (!("content" in operation) || typeof operation.content !== "string") {
    return operation;
  }

  return {
    ...operation,
    content: sanitizeAiInsertedContent(operation.content),
  };
}

function findDependentTableCellUpdateIndex(
  operations: AiDocumentEditOperation[],
  operation: AiDocumentEditOperation,
  operationIndex: number,
) {
  const insertedColumn =
    operation.type === "insert_table_column_after"
      ? (operation.column ?? 1) + 1
      : operation.type === "insert_table_column_before"
        ? operation.column ?? 1
        : null;

  if (!insertedColumn) {
    return -1;
  }

  return operations.findIndex(
    (candidate, candidateIndex) =>
      candidateIndex > operationIndex &&
      candidate.type === "update_table_cell" &&
      candidate.blockId === operation.blockId &&
      candidate.row === 1 &&
      candidate.column === insertedColumn &&
      Boolean(candidate.content?.trim()),
  );
}

function isNonAppliedEditSummary(summary: string) {
  return /^(?:未修改文档|No matching document target found\.?|I cannot do that edit yet\.?|I cannot do whole-document replacement yet\.?|模型没有返回可应用的文档操作，未修改文档。)/i.test(
    summary.trim(),
  );
}

function toPreviewLine(operation: AiDocumentEditOperation) {
  switch (operation.type) {
    case "insert_after_block":
      return `将插入到块后：${previewContent(operation.content)}`;
    case "insert_before_block":
      return `将插入到块前：${previewContent(operation.content)}`;
    case "replace_block":
      return `将整块替换为：${previewContent(operation.content)}`;
    case "delete_block":
      return "将删除一个块";
    case "replace_text_in_block":
      return operation.targetText
        ? `将把“${operation.targetText}”改成“${previewContent(operation.replacementText)}”`
        : null;
    case "replace_all_text":
      return operation.targetText
        ? `将把所有“${operation.targetText}”改成“${previewContent(operation.replacementText)}”`
        : null;
    case "set_heading_level":
      return `将标题调整为 ${operation.level} 级`;
    case "set_task_item_checked":
      return operation.targetText
        ? operation.checked
          ? `将勾选任务“${operation.targetText}”`
          : `将取消勾选任务“${operation.targetText}”`
        : null;
    case "set_text_marks":
      return operation.targetText ? `将修改“${operation.targetText}”的文本样式` : null;
    case "unset_text_marks":
      return operation.targetText ? `将移除“${operation.targetText}”的文本样式` : null;
    case "set_link":
      return operation.targetText
        ? `将更新“${operation.targetText}”的链接为 ${previewContent(operation.href)}`
        : null;
    case "unset_link":
      return operation.targetText ? `将移除“${operation.targetText}”的链接` : null;
    case "update_table_cell":
      return `将把表格第 ${operation.row} 行第 ${operation.column} 列改成：${previewContent(operation.content)}`;
    case "set_block_type":
      return `将块类型改成 ${operation.blockType}`;
    case "set_list_type":
      return `将列表类型改成 ${operation.listType}`;
    case "insert_table_row_before":
      return `将新增表格第 ${operation.row} 行之前的一行`;
    case "insert_table_row_after":
      return `将新增表格第 ${operation.row} 行之后的一行`;
    case "delete_table_row":
      return `将删除表格第 ${operation.row} 行`;
    case "insert_table_column_before":
      return `将新增表格第 ${operation.column} 列之前的一列`;
    case "insert_table_column_after":
      return `将新增表格第 ${operation.column} 列之后的一列`;
    case "delete_table_column":
      return `将删除表格第 ${operation.column} 列`;
    case "toggle_table_header_row":
      return "将切换表格标题行";
    case "move_block":
      return "将移动一个块";
    case "copy_block":
      return "将复制一个块";
    default:
      return null;
  }
}

function previewContent(value?: string) {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "空内容";
  }

  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}
