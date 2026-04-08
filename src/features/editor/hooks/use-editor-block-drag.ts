"use client";

import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import type { BlockDragState, HoveredBlock } from "@/features/editor/lib/types";
import { getBlockDropTargetFromPointer } from "@/features/editor/lib/utils";

const idleDragState: BlockDragState = {
  active: false,
  draggedPos: null,
  dropPos: null,
  indicatorTop: null,
};

type UseEditorBlockDragArgs = {
  canEditBody: boolean;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  setBlockMenu: (value: {
    left: number;
    open: boolean;
    pos: number | null;
    showTurnInto: boolean;
    turnIntoAlign: "bottom" | "top";
    top: number;
  }) => void;
  syncHoveredBlockFromPos: (position: number) => void;
};

export function useEditorBlockDrag({
  canEditBody,
  editor,
  editorContainerRef,
  setBlockMenu,
  syncHoveredBlockFromPos,
}: UseEditorBlockDragArgs) {
  const [dragState, setDragState] = useState<BlockDragState>(idleDragState);
  const suppressClickRef = useRef(false);
  const latestDropPosRef = useRef<number | null>(null);

  const handleGripPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, hoveredBlock: HoveredBlock) => {
      if (!canEditBody || !editor) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const startX = event.clientX;
      const startY = event.clientY;
      let dragging = false;

      const closeMenu = () =>
        setBlockMenu({
          left: 0,
          open: false,
          pos: null,
          showTurnInto: false,
          top: 0,
          turnIntoAlign: "top",
        });

      const finalizeDrag = (dropPos: number | null) => {
        if (!editor || dropPos == null) {
          return;
        }

        const sourcePos = hoveredBlock.pos;
        const sourceNode = editor.state.doc.nodeAt(sourcePos);

        if (!sourceNode) {
          return;
        }

        const sourceEnd = sourcePos + sourceNode.nodeSize;

        if (dropPos === sourcePos || dropPos === sourceEnd) {
          return;
        }

        const transaction = editor.state.tr.delete(sourcePos, sourceEnd);
        const insertPos = dropPos > sourcePos ? dropPos - sourceNode.nodeSize : dropPos;

        if (insertPos === sourcePos) {
          return;
        }

        transaction.insert(insertPos, sourceNode);
        transaction.setSelection(
          TextSelection.near(transaction.doc.resolve(Math.min(insertPos + 1, transaction.doc.content.size))),
        );
        editor.view.dispatch(transaction);
        editor.view.focus();
        window.requestAnimationFrame(() => syncHoveredBlockFromPos(insertPos));
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!editor) {
          return;
        }

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (!dragging && Math.hypot(deltaX, deltaY) < 4) {
          return;
        }

        if (!dragging) {
          dragging = true;
          suppressClickRef.current = true;
          closeMenu();
        }

        const container = editorContainerRef.current;
        const editorRoot = container?.querySelector(".ProseMirror");

        if (!(container instanceof HTMLElement) || !(editorRoot instanceof HTMLElement)) {
          return;
        }

        const target = getBlockDropTargetFromPointer(
          editor,
          editorRoot,
          container,
          moveEvent.clientY,
          hoveredBlock.pos,
        );

        if (!target) {
          return;
        }

        setDragState({
          active: true,
          draggedPos: hoveredBlock.pos,
          dropPos: target.dropPos,
          indicatorTop: target.indicatorTop,
        });
        latestDropPosRef.current = target.dropPos;
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);

        if (dragging) {
          finalizeDrag(latestDropPosRef.current);
        }

        latestDropPosRef.current = null;
        setDragState(idleDragState);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [canEditBody, editor, editorContainerRef, setBlockMenu, syncHoveredBlockFromPos],
  );

  const shouldSuppressGripClick = useCallback(() => suppressClickRef.current, []);

  return {
    dragState,
    handleGripPointerDown,
    shouldSuppressGripClick,
  };
}
