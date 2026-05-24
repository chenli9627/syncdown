import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { toExecutableOperations } from "@/features/editor/lib/ai-chat-document-edit-converter";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
import type {
  AiDocumentEditOperation,
  AiDocumentEditPayload,
} from "@/features/editor/lib/ai-chat-document-edit-types";

export function getAiDocumentBlocks(editor: Editor | null): AiChatDocumentBlock[] {
  return getLocalAiDocumentBlocks(editor).map(toAiDocumentBlock);
}

export function applyAiDocumentEditToolResponse(editor: Editor | null, responseText: string) {
  if (!editor) {
    return 0;
  }

  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload?.operations?.length) {
    return 0;
  }

  const payloadOperations = normalizeDependentTableInsertOperations(payload.operations);
  const blocks = getLocalAiDocumentBlocks(editor);
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

  return appliedCount;
}

export function getAiDocumentEditToolSummary(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  if (!payload) {
    return null;
  }

  const summary = payload.summary?.trim();
  const operations = payload.operations ?? [];

  if (!operations.length) {
    return summary || null;
  }

  return summary || "Document edit operations generated.";
}

export function getAiDocumentEditToolOperationCount(responseText: string) {
  const payload = parseAiDocumentEditPayload(responseText);

  return payload ? normalizeDependentTableInsertOperations(payload.operations).length : 0;
}

function parseAiDocumentEditPayload(responseText: string): AiDocumentEditPayload | null {
  const jsonText = extractJsonObject(responseText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as AiDocumentEditPayload;
    return Array.isArray(parsed.operations) ? parsed : null;
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
