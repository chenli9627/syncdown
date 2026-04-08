"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import type { HoveredBlock } from "@/features/editor/lib/types";
import {
  getHoveredBlockFromPointer,
  getTopLevelBlock,
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

      const container = editorContainerRef.current;
      const domNode = editor.view.nodeDOM(position);

      if (!(container instanceof HTMLElement) || !(domNode instanceof HTMLElement)) {
        return;
      }

      const blockBounds = domNode.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();

      setHoveredBlock({
        height: blockBounds.height,
        pos: position,
        top: blockBounds.top - containerBounds.top,
      });
    },
    [editor, editorContainerRef],
  );

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

      let pos: number | null = null;

      try {
        pos = editor.view.posAtDOM(blockElement, 0);
      } catch {
        pos = null;
      }

      if (pos == null) {
        setHoveredBlock(null);
        return;
      }

      const blockBounds = blockElement.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();

      setHoveredBlock({
        height: blockBounds.height,
        pos,
        top: blockBounds.top - containerBounds.top,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      syncHoveredBlock(event.target, event.clientY);
    };

    const handlePointerLeave = () => {
      setHoveredBlock(null);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [blockControlsRef, blockMenuRef, canEditBody, editor, editorContainerRef]);

  return {
    hoveredBlock,
    setHoveredBlock,
    syncHoveredBlockFromPos,
  };
}
