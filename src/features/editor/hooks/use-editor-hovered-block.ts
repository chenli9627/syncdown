"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import type { HoveredBlock } from "@/features/editor/lib/types";
import {
  BLOCK_ELEMENT_SELECTOR,
  getHoveredBlockFromPointer,
  getTopLevelBlock,
  getTopLevelBlockInfoFromElement,
  getTopLevelBlockStartPos,
} from "@/features/editor/lib/utils";

type UseEditorHoveredBlockArgs = {
  blockControlsRef: React.RefObject<HTMLDivElement | null>;
  blockMenuRef: React.RefObject<HTMLDivElement | null>;
  canEditBody: boolean;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function useEditorHoveredBlock({
  blockControlsRef,
  blockMenuRef,
  canEditBody,
  editor,
  editorContainerRef,
}: UseEditorHoveredBlockArgs) {
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);

  const syncHoveredBlockFromPos = useCallback(
    (position: number) => {
      if (!editor) {
        return;
      }

      if (position < 0 || position > editor.state.doc.content.size) {
        setHoveredBlock(null);
        return;
      }

      const container = editorContainerRef.current;
      let domNode: Node | null = null;

      try {
        domNode = editor.view.nodeDOM(position);
      } catch {
        setHoveredBlock(null);
        return;
      }

      const blockElement =
        (domNode instanceof HTMLElement ? domNode : domNode?.parentElement)?.closest(
          BLOCK_ELEMENT_SELECTOR,
        ) ?? null;

      if (!(container instanceof HTMLElement) || !(blockElement instanceof HTMLElement)) {
        setHoveredBlock(null);
        return;
      }

      const blockInfo = getTopLevelBlockInfoFromElement(editor, blockElement, container);

      if (!blockInfo) {
        setHoveredBlock(null);
        return;
      }

      setHoveredBlock({
        height: blockInfo.height,
        left: blockInfo.left,
        pos: blockInfo.pos,
        top: blockInfo.top,
        width: blockInfo.width,
      });
    },
    [editor, editorContainerRef],
  );

  const syncHoveredBlockFromSelection = useCallback(() => {
    if (!editor) {
      return;
    }

    syncHoveredBlockFromPos(getTopLevelBlockStartPos(editor, editor.state.selection.from));
  }, [editor, syncHoveredBlockFromPos]);

  useEffect(() => {
    if (!editor || !canEditBody) {
      return;
    }

    const container = editorContainerRef.current;
    const editorRoot = container?.querySelector(".ProseMirror");

    if (!(editorRoot instanceof HTMLElement) || !container) {
      return;
    }

    const syncHoveredBlock = (target: EventTarget | null, clientY?: number) => {
      if (target instanceof Node) {
        if (blockControlsRef.current?.contains(target) || blockMenuRef.current?.contains(target)) {
          return;
        }
      }

      if (typeof clientY === "number") {
        const hoveredBlockFromPointer = getHoveredBlockFromPointer(
          editor,
          editorRoot,
          container,
          clientY,
        );

        if (hoveredBlockFromPointer) {
          setHoveredBlock(hoveredBlockFromPointer);
          return;
        }
      }

      const blockElement = getTopLevelBlock(target, editorRoot);

      if (!blockElement) {
        setHoveredBlock(null);
        return;
      }

      const blockInfo = getTopLevelBlockInfoFromElement(editor, blockElement, container);

      if (!blockInfo) {
        setHoveredBlock(null);
        return;
      }

      setHoveredBlock({
        height: blockInfo.height,
        left: blockInfo.left,
        pos: blockInfo.pos,
        top: blockInfo.top,
        width: blockInfo.width,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      syncHoveredBlock(event.target, event.clientY);
    };

    const handlePointerLeave = () => {
      syncHoveredBlockFromSelection();
    };
    const initialFrame = window.requestAnimationFrame(syncHoveredBlockFromSelection);

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    editor.on("selectionUpdate", syncHoveredBlockFromSelection);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      editor.off("selectionUpdate", syncHoveredBlockFromSelection);
    };
  }, [
    blockControlsRef,
    blockMenuRef,
    canEditBody,
    editor,
    editorContainerRef,
    syncHoveredBlockFromSelection,
  ]);

  useEffect(() => {
    if (!editor || !canEditBody || !hoveredBlock) {
      return;
    }

    const syncCurrentHoveredBlock = () => {
      syncHoveredBlockFromSelection();
    };

    editor.on("update", syncCurrentHoveredBlock);

    return () => {
      editor.off("update", syncCurrentHoveredBlock);
    };
  }, [canEditBody, editor, hoveredBlock, syncHoveredBlockFromSelection]);

  return {
    hoveredBlock,
    setHoveredBlock,
    syncHoveredBlockFromPos,
  };
}
