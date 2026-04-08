"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { generateAiPreview, toAiInsertHtml, type AiActionKind } from "@/features/editor/lib/ai";
import type { AiBubbleState, SelectionBubbleState } from "@/features/editor/lib/types";

type UseEditorSelectionAiArgs = {
  canEditBody: boolean;
  editor: Editor | null;
};

export function useEditorSelectionAi({ canEditBody, editor }: UseEditorSelectionAiArgs) {
  const { locale } = useLocale();
  const selectionBubbleRef = useRef<HTMLDivElement | null>(null);
  const aiBubbleRef = useRef<HTMLDivElement | null>(null);
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubbleState>(closedSelectionBubble);
  const [aiBubble, setAiBubble] = useState<AiBubbleState>(closedAiBubble);
  const hasWritableResult = !aiBubble.viewOnly && Boolean(aiBubble.result.trim());
  const visibleSelectionBubble = canEditBody ? selectionBubble : closedSelectionBubble();
  const visibleAiBubble = canEditBody ? aiBubble : closedAiBubble();

  useEffect(() => {
    if (!editor || !canEditBody) {
      return;
    }

    const syncSelectionBubble = () => {
      if (visibleAiBubble.open || !editor.isFocused) {
        setSelectionBubble(closedSelectionBubble());
        return;
      }

      const { from, to } = editor.state.selection;

      if (from === to) {
        setSelectionBubble(closedSelectionBubble());
        return;
      }

      const selectedText = editor.state.doc.textBetween(from, to, "\n").trim();

      if (!selectedText) {
        setSelectionBubble(closedSelectionBubble());
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setSelectionBubble({
        from,
        left: Math.max(16, (start.left + end.right) / 2),
        open: true,
        text: selectedText,
        to,
        top: Math.max(16, start.top - 56),
      });
    };

    syncSelectionBubble();
    editor.on("selectionUpdate", syncSelectionBubble);
    editor.on("focus", syncSelectionBubble);
    editor.on("blur", syncSelectionBubble);

    return () => {
      editor.off("selectionUpdate", syncSelectionBubble);
      editor.off("focus", syncSelectionBubble);
      editor.off("blur", syncSelectionBubble);
    };
  }, [canEditBody, editor, visibleAiBubble.open]);

  useEffect(() => {
    if (!selectionBubble.open && !aiBubble.open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        selectionBubbleRef.current?.contains(target) ||
        aiBubbleRef.current?.contains(target)
      ) {
        return;
      }

      setSelectionBubble(closedSelectionBubble());
      setAiBubble(closedAiBubble());
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setSelectionBubble(closedSelectionBubble());
      setAiBubble(closedAiBubble());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aiBubble.open, selectionBubble.open]);

  const actions = useMemo(
    () => ({
      applyResult() {
        if (!editor || !hasWritableResult) {
          return;
        }

        editor
          .chain()
          .focus()
          .insertContentAt({ from: aiBubble.from, to: aiBubble.to }, aiBubble.result)
          .run();
        setAiBubble(closedAiBubble());
        setSelectionBubble(closedSelectionBubble());
      },
      insertBelow() {
        if (!editor || !hasWritableResult) {
          return;
        }

        editor.chain().focus().insertContentAt(aiBubble.to, toAiInsertHtml(aiBubble.result)).run();
        setAiBubble(closedAiBubble());
        setSelectionBubble(closedSelectionBubble());
      },
      openAiMenu() {
        if (!visibleSelectionBubble.open) {
          return;
        }

        setSelectionBubble(closedSelectionBubble());
        setAiBubble({
          action: null,
          from: visibleSelectionBubble.from,
          left: visibleSelectionBubble.left,
          open: true,
          prompt: "",
          result: "",
          text: visibleSelectionBubble.text,
          to: visibleSelectionBubble.to,
          top: visibleSelectionBubble.top,
          viewOnly: false,
        });
      },
      previewAction(action: AiActionKind) {
        const preview = generateAiPreview(action, aiBubble.text, locale, aiBubble.prompt);
        setAiBubble((current) => ({
          ...current,
          action,
          result: preview.text,
          viewOnly: preview.viewOnly,
        }));
      },
      setPrompt(value: string) {
        setAiBubble((current) => ({
          ...current,
          prompt: value,
        }));
      },
      closeAll() {
        setAiBubble(closedAiBubble());
        setSelectionBubble(closedSelectionBubble());
      },
      formatSelection(command: "bold" | "italic" | "strike" | "code") {
        if (!editor) {
          return;
        }

        const chain = editor.chain().focus();
        if (command === "bold") chain.toggleBold();
        if (command === "italic") chain.toggleItalic();
        if (command === "strike") chain.toggleStrike();
        if (command === "code") chain.toggleCode();
        chain.run();
      },
    }),
    [aiBubble, editor, hasWritableResult, locale, visibleSelectionBubble],
  );

  return {
    actions,
    aiBubble: visibleAiBubble,
    aiBubbleRef,
    selectionBubble: visibleSelectionBubble,
    selectionBubbleRef,
  };
}

function closedSelectionBubble(): SelectionBubbleState {
  return {
    from: 0,
    left: 0,
    open: false,
    text: "",
    to: 0,
    top: 0,
  };
}

function closedAiBubble(): AiBubbleState {
  return {
    action: null,
    from: 0,
    left: 0,
    open: false,
    prompt: "",
    result: "",
    text: "",
    to: 0,
    top: 0,
    viewOnly: false,
  };
}
