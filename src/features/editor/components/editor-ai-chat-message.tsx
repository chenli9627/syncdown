"use client";

import type { Editor } from "@tiptap/react";
import {
  Check,
  ChevronRight,
  CopyPlus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { AiChatMessage } from "@/features/app-state/types";
import { toAiInsertHtml } from "@/features/editor/lib/ai";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  discarded: boolean;
  editor: Editor | null;
  message: AiChatMessage;
  onDiscard: () => void;
  onRegenerate: () => void;
};

export function ChatMessage({
  discarded,
  editor,
  message,
  onDiscard,
  onRegenerate,
}: ChatMessageProps) {
  const text = getMessageText(message);
  const isAssistant = message.role === "assistant";

  return (
    <Message className={isAssistant ? "items-start" : "items-end"}>
      <MessageContent
        className={cn(
          isAssistant
            ? "w-full bg-[var(--color-surface)]"
            : "max-w-[88%] bg-[var(--color-muted)]",
        )}
      >
        {isAssistant ? <MessageResponse>{text}</MessageResponse> : text}
      </MessageContent>
      {isAssistant && text.trim() && !discarded ? (
        <MessageActions>
          <MessageAction
            onClick={() => replaceSelection(editor, message, text)}
            tooltip="Replace original selection"
          >
            <Check aria-hidden="true" size={13} />
            Replace
          </MessageAction>
          <MessageAction
            onClick={() => insertAtCursor(editor, text)}
            tooltip="Insert at cursor"
          >
            <ChevronRight aria-hidden="true" size={13} />
            Cursor
          </MessageAction>
          <MessageAction onClick={() => insertAtEnd(editor, text)} tooltip="Insert at end">
            <CopyPlus aria-hidden="true" size={13} />
            End
          </MessageAction>
          <MessageAction onClick={onRegenerate} tooltip="Retry">
            <RefreshCw aria-hidden="true" size={13} />
            Retry
          </MessageAction>
          <MessageAction onClick={onDiscard} tooltip="Hide actions">
            <X aria-hidden="true" size={13} />
            Discard
          </MessageAction>
        </MessageActions>
      ) : null}
    </Message>
  );
}

function getMessageText(message: AiChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function replaceSelection(editor: Editor | null, message: AiChatMessage, text: string) {
  const selection = message.metadata?.selection;

  if (!editor || !selection) {
    return;
  }

  const currentText = editor.state.doc
    .textBetween(selection.from, selection.to, "\n")
    .trim();

  if (currentText !== selection.text.trim()) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt({ from: selection.from, to: selection.to }, toAiInsertHtml(text))
    .run();
}

function insertAtCursor(editor: Editor | null, text: string) {
  editor?.chain().focus().insertContent(toAiInsertHtml(text)).run();
}

function insertAtEnd(editor: Editor | null, text: string) {
  if (!editor) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(editor.state.doc.content.size, toAiInsertHtml(text))
    .run();
}
