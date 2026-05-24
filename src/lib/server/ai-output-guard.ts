import type { TextStreamPart, ToolSet } from "ai";
import type {
  AiChatDocumentAction,
  AiChatResponseMode,
} from "@/features/app-state/types";
import {
  containsPseudoToolCallText,
  sanitizeAiAssistantText,
} from "@/features/editor/lib/ai-chat-output-guard";

export function guardPseudoToolCallText<TOOLS extends ToolSet>(
  documentAction: AiChatDocumentAction | null,
  responseMode: AiChatResponseMode | null,
) {
  return () => {
    let blocked = false;
    let fallbackEmitted = false;
    let textBuffer = "";
    let textId: string | null = null;

    function flushText(controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) {
      if (blocked) {
        if (!fallbackEmitted && textId) {
          controller.enqueue({
            id: textId,
            text: sanitizeAiAssistantText(textBuffer, documentAction, responseMode),
            type: "text-delta",
          });
          fallbackEmitted = true;
        }
        textBuffer = "";
        return;
      }

      if (textBuffer && textId) {
        controller.enqueue({
          id: textId,
          text: sanitizeAiAssistantText(textBuffer, documentAction, responseMode),
          type: "text-delta",
        });
        textBuffer = "";
      }
    }

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      flush(controller) {
        flushText(controller);
      },
      transform(chunk, controller) {
        if (chunk.type === "text-start") {
          textId = chunk.id;
          controller.enqueue(chunk);
          return;
        }

        if (chunk.type === "text-delta") {
          textId = chunk.id;
          textBuffer += chunk.text;

          if (containsPseudoToolCallText(textBuffer)) {
            blocked = true;
          }
          return;
        }

        if (chunk.type === "text-end") {
          flushText(controller);
          controller.enqueue(chunk);
          return;
        }

        controller.enqueue(chunk);
      },
    });
  };
}
