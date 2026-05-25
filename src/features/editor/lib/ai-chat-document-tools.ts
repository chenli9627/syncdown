import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { parseAiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-plan";
import { toExecutableOperations } from "@/features/editor/lib/ai-chat-document-edit-converter";
import {
  applyContiguousMoveOperationGroup,
  getContiguousMoveOperationGroups,
} from "@/features/editor/lib/ai-chat-document-edit-move-groups";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
import { verifyAiDocumentEditOperations } from "@/features/editor/lib/ai-chat-document-edit-verification";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";

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
  const plan = parseAiDocumentEditPlan(responseText);

  return applyAiDocumentEditPayloadWithVerification(editor, plan?.payload ?? null);
}

export function applyAiDocumentEditPayloadWithVerification(
  editor: Editor | null,
  payload: AiDocumentEditPayload | null,
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

  if (!payload?.operations?.length) {
    return emptyResult;
  }

  const blocks = getLocalAiDocumentBlocks(editor);
  const payloadOperations = normalizeDocumentEndInsertOperations(
    payload.operations,
    payload.summary,
    blocks,
  );
  const beforeSnapshot = editor.state.doc.toJSON();
  const moveGroups = getContiguousMoveOperationGroups(payloadOperations, blocks);
  const groupedOperationIndexes = new Set(
    moveGroups.flatMap((group) => group.operationIndexes),
  );
  const operations = payloadOperations
    .flatMap((operation, index) =>
      groupedOperationIndexes.has(index)
        ? []
        : toExecutableOperations(operation, blocks, index),
    )
    .sort((a, b) => b.position - a.position || b.index - a.index);

  let appliedCount = 0;

  moveGroups.forEach((group) => {
    try {
      if (applyContiguousMoveOperationGroup(editor, group)) {
        appliedCount += group.operationIndexes.length;
      }
    } catch {
      return;
    }
  });

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
      appliedCount,
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

function normalizeDocumentEndInsertOperations(
  operations: AiDocumentEditPayload["operations"] = [],
  summary: string | undefined,
  blocks: AiChatDocumentBlock[],
) {
  const lastBlock = blocks[blocks.length - 1];

  if (!lastBlock || !summary || !/(?:文档)?(?:末尾|最后|结尾|底部)|\b(?:end|bottom)\b/i.test(summary)) {
    return operations;
  }

  return operations.map((operation) =>
    operation.type === "insert_after_block"
      ? {
          ...operation,
          blockId: lastBlock.id,
        }
      : operation,
  );
}

export function getAiDocumentEditToolSummary(responseText: string) {
  return parseAiDocumentEditPlan(responseText)?.summary ?? null;
}

export function getAiDocumentEditToolOperationCount(responseText: string) {
  return parseAiDocumentEditPlan(responseText)?.requestedCount ?? 0;
}

export function getAiDocumentEditToolPreviewLines(responseText: string) {
  return parseAiDocumentEditPlan(responseText)?.previewLines ?? [];
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
