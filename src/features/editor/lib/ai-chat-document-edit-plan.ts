import { sanitizeAiInsertedContent } from "@/features/editor/lib/ai-chat-output-guard";
import { normalizeAiDocumentEditOperationType } from "@/features/editor/lib/ai-chat-document-edit-operation-normalization";
import type {
  AiDocumentEditOperation,
  AiDocumentEditPayload,
  AiDocumentEditPlan,
} from "@/features/editor/lib/ai-chat-document-edit-types";

export function parseAiDocumentEditPlan(responseText: string): AiDocumentEditPlan | null {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload) {
    return null;
  }

  const operations = normalizeDependentTableInsertOperations(payload.operations);

  return {
    payload: {
      ...payload,
      operations,
    },
    previewLines: operations
      .map((operation) => toPreviewLine(operation))
      .filter((line): line is string => Boolean(line)),
    requestedCount: operations.length,
    responseText,
    summary: getAiDocumentEditPayloadSummary(payload.summary, operations),
  };
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
          operations: parsed.operations
            .map(sanitizeAiDocumentEditOperation)
            .filter((operation): operation is AiDocumentEditOperation => Boolean(operation)),
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

function getAiDocumentEditPayloadSummary(
  summary: string | undefined,
  operations: AiDocumentEditOperation[],
) {
  const trimmedSummary = summary?.trim();

  if (!operations.length) {
    if (!trimmedSummary) {
      return "模型没有返回可应用的文档操作，未修改文档。";
    }

    return isNonAppliedEditSummary(trimmedSummary)
      ? trimmedSummary
      : "模型没有返回可应用的文档操作，未修改文档。";
  }

  return trimmedSummary || "Document edit operations generated.";
}

export function normalizeDependentTableInsertOperations(
  operations: AiDocumentEditOperation[] = [],
) {
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

function sanitizeAiDocumentEditOperation(
  operation: AiDocumentEditOperation,
): AiDocumentEditOperation | null {
  const rawOperation = operation as AiDocumentEditOperation & { type?: string };
  const normalizedType = normalizeAiDocumentEditOperationType(rawOperation.type);

  if (!normalizedType) {
    return null;
  }

  if (normalizedType === "move_before_block") {
    return {
      ...rawOperation,
      placement: "before",
      type: "move_block",
    };
  }

  if (normalizedType === "move_after_block") {
    return {
      ...rawOperation,
      placement: "after",
      type: "move_block",
    };
  }

  const normalizedOperation = {
    ...rawOperation,
    type: normalizedType,
  };

  if (!("content" in operation) || typeof operation.content !== "string") {
    return normalizedOperation;
  }

  return {
    ...normalizedOperation,
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
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "(空)";
  }

  return normalized.length > 48 ? `${normalized.slice(0, 48)}…` : normalized;
}
