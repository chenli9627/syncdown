"use client";

import type { Editor } from "@tiptap/react";
import { useEffect } from "react";
import type { RefObject } from "react";

type UseEditorScrollClampArgs = {
  editor: Editor | null;
  editorContainerRef: RefObject<HTMLDivElement | null>;
};

export function useEditorScrollClamp({
  editor,
  editorContainerRef,
}: UseEditorScrollClampArgs) {
  useEffect(() => {
    const container = editorContainerRef.current;
    const scrollHost = container?.closest("main");
    const editorRoot = container?.querySelector(".ProseMirror");

    if (!(scrollHost instanceof HTMLElement) || !(editorRoot instanceof HTMLElement)) {
      return;
    }

    const clampScrollTop = () => {
      const maxScrollTop = Math.max(0, scrollHost.scrollHeight - scrollHost.clientHeight);

      if (scrollHost.scrollTop > maxScrollTop) {
        scrollHost.scrollTop = maxScrollTop;
      }
    };

    const runClamp = () => {
      window.requestAnimationFrame(clampScrollTop);
    };

    const resizeObserver = new ResizeObserver(runClamp);
    resizeObserver.observe(editorRoot);
    resizeObserver.observe(scrollHost);

    editor?.on("update", runClamp);
    runClamp();

    return () => {
      resizeObserver.disconnect();
      editor?.off("update", runClamp);
    };
  }, [editor, editorContainerRef]);
}
