import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { parseAiDocumentEditPlan } from "@/features/editor/lib/ai-chat-document-edit-plan";
import { toExecutableOperations } from "@/features/editor/lib/ai-chat-document-edit-converter";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
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

  const plan = parseAiDocumentEditPlan(responseText);

  if (!plan?.payload.operations?.length) {
    return emptyResult;
  }

  const payloadOperations = plan.payload.operations;
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
