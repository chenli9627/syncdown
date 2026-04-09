"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getAiViewOnly,
  toAiInsertHtml,
  type AiActionKind,
} from "@/features/editor/lib/ai";
import type { AiBubbleState, SelectionBubbleState } from "@/features/editor/lib/types";
import { getSearchRects } from "@/features/editor/lib/search";

type UseEditorSelectionAiArgs = {
  canEditBody: boolean;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function useEditorSelectionAi({
  canEditBody,
  editor,
  editorContainerRef,
}: UseEditorSelectionAiArgs) {
  const { locale } = useLocale();
  const selectionBubbleRef = useRef<HTMLDivElement | null>(null);
  const aiBubbleRef = useRef<HTMLDivElement | null>(null);
  const dismissedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubbleState>(closedSelectionBubble);
  const [aiBubble, setAiBubble] = useState<AiBubbleState>(closedAiBubble);
  const hasWritableResult = !aiBubble.viewOnly && Boolean(aiBubble.result.trim());
  const visibleSelectionBubble = canEditBody ? selectionBubble : closedSelectionBubble();
  const visibleAiBubble = canEditBody ? aiBubble : closedAiBubble();
  const dismissAll = useCallback(() => {
    const currentSelection =
      aiBubble.open
        ? { from: aiBubble.from, to: aiBubble.to }
        : selectionBubble.open
          ? { from: selectionBubble.from, to: selectionBubble.to }
          : editor
            ? {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              }
            : null;

    dismissedSelectionRef.current =
      currentSelection && currentSelection.from !== currentSelection.to
        ? currentSelection
        : null;
    setAiBubble(closedAiBubble());
    setSelectionBubble(closedSelectionBubble());
  }, [aiBubble.from, aiBubble.open, aiBubble.to, editor, selectionBubble.from, selectionBubble.open, selectionBubble.to]);

  useEffect(() => {
    if (!editor || !canEditBody) {
      return;
    }

    const syncSelectionBubble = () => {
      if (visibleAiBubble.open || !editor.isFocused) {
        setSelectionBubble(closedSelectionBubble());
        return;
      }

      const nextSelectionBubble = getSelectionBubbleFromEditor(editor);
      const dismissedSelection = dismissedSelectionRef.current;

      if (
        dismissedSelection &&
        nextSelectionBubble.open &&
        nextSelectionBubble.from === dismissedSelection.from &&
        nextSelectionBubble.to === dismissedSelection.to
      ) {
        setSelectionBubble(closedSelectionBubble());
        return;
      }

      dismissedSelectionRef.current = null;
      setSelectionBubble(nextSelectionBubble);
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

      dismissAll();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      dismissAll();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aiBubble.open, dismissAll, selectionBubble.open]);

  const actions = useMemo(
    () => ({
      applyResult() {
        if (!editor || !hasWritableResult) {
          return;
        }

        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: aiBubble.from, to: aiBubble.to },
            aiBubble.resultHtml || toAiInsertHtml(aiBubble.result),
          )
          .run();
        setAiBubble(closedAiBubble());
        setSelectionBubble(closedSelectionBubble());
      },
      insertBelow() {
        if (!editor || !hasWritableResult) {
          return;
        }

        editor
          .chain()
          .focus()
          .insertContentAt(aiBubble.to, aiBubble.resultHtml || toAiInsertHtml(aiBubble.result))
          .run();
        setAiBubble(closedAiBubble());
        setSelectionBubble(closedSelectionBubble());
      },
      openAiMenu() {
        if (!visibleSelectionBubble.open) {
          return;
        }

        const bubblePosition = getAiBubblePosition(editor, visibleSelectionBubble);
        setSelectionBubble(closedSelectionBubble());
        setAiBubble({
          action: null,
          error: null,
          from: visibleSelectionBubble.from,
          highlightRects: getSelectionHighlightRects(
            editor,
            editorContainerRef.current,
            visibleSelectionBubble.from,
            visibleSelectionBubble.to,
          ),
          left: bubblePosition.left,
          loading: false,
          open: true,
          prompt: "",
          result: "",
          resultHtml: "",
          text: visibleSelectionBubble.text,
          to: visibleSelectionBubble.to,
          top: bubblePosition.top,
          viewOnly: false,
        });
      },
      async previewAction(action: AiActionKind) {
        setAiBubble((current) => ({
          ...current,
          action,
          error: null,
          loading: true,
          result: "",
          viewOnly: getAiViewOnly(action),
        }));

        try {
          const response = await fetch("/api/ai/action", {
            body: JSON.stringify({
              action,
              locale,
              prompt: action === "custom" ? aiBubble.prompt : undefined,
              selectedText: aiBubble.text,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });

          const data = (await response.json().catch(() => null)) as
            | { error?: string; ok?: boolean; result?: string; viewOnly?: boolean }
            | null;

          if (!response.ok || !data?.ok || !data.result) {
            throw new Error(data?.error || "AI request failed");
          }

          setAiBubble((current) => ({
            ...current,
            action,
            error: null,
            highlightRects:
              current.highlightRects.length > 0
                ? current.highlightRects
                : getSelectionHighlightRects(
                    editor,
                    editorContainerRef.current,
                    current.from,
                    current.to,
                  ),
            loading: false,
            result: data.result ?? "",
            resultHtml: toAiInsertHtml(data.result ?? ""),
            viewOnly: data.viewOnly ?? getAiViewOnly(action),
          }));
        } catch {
          setAiBubble((current) => ({
            ...current,
            action,
            error: "generation_failed",
            loading: false,
            result: "",
            resultHtml: "",
            viewOnly: getAiViewOnly(action),
          }));
        }
      },
      setPrompt(value: string) {
        setAiBubble((current) => ({
          ...current,
          prompt: value,
        }));
      },
      dismissAll,
      closeAll() {
        if (!editor) {
          setAiBubble(closedAiBubble());
          setSelectionBubble(closedSelectionBubble());
          return;
        }

        editor
          .chain()
          .focus()
          .setTextSelection({ from: aiBubble.from, to: aiBubble.to })
          .run();
        setAiBubble(closedAiBubble());
        window.requestAnimationFrame(() => {
          setSelectionBubble(getSelectionBubbleFromEditor(editor));
        });
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
    [aiBubble, dismissAll, editor, editorContainerRef, hasWritableResult, locale, visibleSelectionBubble],
  );

  return {
    actions,
    aiBubble: visibleAiBubble,
    aiBubbleRef,
    selectionBubble: visibleSelectionBubble,
    selectionBubbleRef,
  };
}

function getSelectionHighlightRects(
  editor: Editor | null,
  container: HTMLElement | null,
  from: number,
  to: number,
) {
  if (!editor || !(container instanceof HTMLElement) || from === to) {
    return [];
  }

  try {
    const start = editor.view.domAtPos(from);
    const end = editor.view.domAtPos(to);
    const range = globalThis.document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    return getSearchRects(range, container).filter(
      (rect) => rect.width > 0 && rect.height > 0,
    );
  } catch {
    return [];
  }
}

function getSelectionBubbleFromEditor(editor: Editor): SelectionBubbleState {
  const { from, to } = editor.state.selection;

  if (from === to) {
    return closedSelectionBubble();
  }

  const selectedText = editor.state.doc.textBetween(from, to, "\n").trim();

  if (!selectedText) {
    return closedSelectionBubble();
  }

  const domSelection = globalThis.window?.getSelection();
  const range =
    domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
  const rangeRect = range ? range.getBoundingClientRect() : null;
  const rangeRects = range ? Array.from(range.getClientRects()) : [];
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);
  const topRect = rangeRects[0] ?? rangeRect;

  return {
    from,
    left: Math.max(
      16,
      rangeRect && rangeRect.width > 0
        ? rangeRect.left + rangeRect.width / 2
        : (start.left + end.right) / 2,
    ),
    open: true,
    text: selectedText,
    to,
    top: Math.max(16, (topRect?.top ?? start.top) - 56),
  };
}

function getAiBubblePosition(editor: Editor | null, selectionBubble: SelectionBubbleState) {
  const bubbleWidth = 320;
  const bubbleHalfWidth = bubbleWidth / 2;
  const bubbleHeight = 360;
  const screenPadding = 16;

  if (!editor) {
    return {
      left: selectionBubble.left,
      top: selectionBubble.top + 72,
    };
  }

  const start = editor.view.coordsAtPos(selectionBubble.from);
  const end = editor.view.coordsAtPos(selectionBubble.to);
  const selectionCenterY = (start.top + end.bottom) / 2;
  const spaceBelow = window.innerHeight - end.bottom;
  const spaceAbove = start.top;
  const spaceRight = window.innerWidth - end.right;
  const spaceLeft = start.left;

  if (spaceBelow >= bubbleHeight + screenPadding) {
    return {
      left: clampBubbleLeft(selectionBubble.left, bubbleHalfWidth, screenPadding),
      top: clampBubbleTop(end.bottom + 12, bubbleHeight, screenPadding),
    };
  }

  if (spaceRight >= bubbleHalfWidth + 24) {
    return {
      left: clampBubbleLeft(end.right + bubbleHalfWidth + 12, bubbleHalfWidth, screenPadding),
      top: clampBubbleTop(selectionCenterY - bubbleHeight / 2, bubbleHeight, screenPadding),
    };
  }

  if (spaceLeft >= bubbleHalfWidth + 24) {
    return {
      left: clampBubbleLeft(start.left - bubbleHalfWidth - 12, bubbleHalfWidth, screenPadding),
      top: clampBubbleTop(selectionCenterY - bubbleHeight / 2, bubbleHeight, screenPadding),
    };
  }

  return {
    left: clampBubbleLeft(selectionBubble.left, bubbleHalfWidth, screenPadding),
    top:
      spaceAbove >= bubbleHeight + screenPadding
        ? Math.max(screenPadding, start.top - bubbleHeight - 12)
        : clampBubbleTop(end.bottom + 12, bubbleHeight, screenPadding),
  };
}

function clampBubbleLeft(left: number, bubbleHalfWidth: number, screenPadding: number) {
  return Math.min(
    window.innerWidth - bubbleHalfWidth - screenPadding,
    Math.max(bubbleHalfWidth + screenPadding, left),
  );
}

function clampBubbleTop(top: number, bubbleHeight: number, screenPadding: number) {
  return Math.min(
    window.innerHeight - bubbleHeight - screenPadding,
    Math.max(screenPadding, top),
  );
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
    error: null,
    from: 0,
    highlightRects: [],
    left: 0,
    loading: false,
    open: false,
    prompt: "",
    result: "",
    resultHtml: "",
    text: "",
    to: 0,
    top: 0,
    viewOnly: false,
  };
}
