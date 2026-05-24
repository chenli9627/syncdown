import type { Editor } from "@tiptap/react";
import type { AiChatDocumentBlock } from "@/features/app-state/types";
import {
  getLocalAiDocumentBlocks,
  toAiDocumentBlock,
} from "@/features/editor/lib/ai-chat-document-blocks";
import { toExecutableOperations } from "@/features/editor/lib/ai-chat-document-edit-converter";
import { applyExecutableOperation } from "@/features/editor/lib/ai-chat-document-edit-operations";
import type { AiDocumentEditPayload } from "@/features/editor/lib/ai-chat-document-edit-types";

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

  const blocks = getLocalAiDocumentBlocks(editor);
  const operations = payload.operations
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

  if (!payload?.operations?.length) {
    return null;
  }

  return payload.summary?.trim() || "Document edit operations generated.";
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
