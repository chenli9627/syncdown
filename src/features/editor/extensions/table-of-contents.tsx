"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import type { Editor, NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";

type OutlineHeading = {
  id: string;
  level: 1 | 2 | 3 | 4;
  pos: number;
  text: string;
};

type OutlineState = {
  activeId: string | null;
  headings: OutlineHeading[];
};

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="table-of-contents"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "table-of-contents",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsNodeView);
  },
});

function TableOfContentsNodeView({ editor, selected }: NodeViewProps) {
  const { t } = useLocale();
  const [outline, setOutline] = useState<OutlineState>(() => collectOutline(editor));

  useEffect(() => {
    const updateOutline = () => {
      setOutline(collectOutline(editor));
    };

    updateOutline();
    editor.on("transaction", updateOutline);
    editor.on("selectionUpdate", updateOutline);

    return () => {
      editor.off("transaction", updateOutline);
      editor.off("selectionUpdate", updateOutline);
    };
  }, [editor]);

  return (
    <NodeViewWrapper
      className={`table-of-contents-block py-1 text-base leading-7 transition ${
        selected ? "bg-[color-mix(in_srgb,var(--color-muted)_58%,transparent)]" : ""
      }`}
      contentEditable={false}
      data-type="table-of-contents"
    >
      {outline.headings.length > 0 ? (
        <div className="space-y-[1px]">
          {outline.headings.map((heading) => (
            <button
              className={`block w-full truncate px-1 py-[1px] text-left text-[15px] leading-7 underline decoration-[color-mix(in_srgb,var(--color-muted-foreground)_38%,transparent)] underline-offset-[3px] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)] ${
                outline.activeId === heading.id
                  ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              }`}
              key={heading.id}
              onClick={(event) => {
                event.preventDefault();
                jumpToHeading(editor, heading.pos);
              }}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              style={{
                paddingLeft: `${4 + (heading.level - 1) * 18}px`,
              }}
              type="button"
            >
              {heading.text}
            </button>
          ))}
        </div>
      ) : (
        <p className="m-0 px-1 text-[15px] leading-7 text-[var(--color-muted-foreground)]">
          {t("tableOfContentsEmpty")}
        </p>
      )}
    </NodeViewWrapper>
  );
}

function collectOutline(editor: Editor): OutlineState {
  const headings: OutlineHeading[] = [];
  const selectionFrom = editor.state.selection.from;
  let activeId: string | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") {
      return true;
    }

    const level = node.attrs.level;

    if (![1, 2, 3, 4].includes(level)) {
      return false;
    }

    const text = node.textContent.trim();

    if (!text) {
      return false;
    }

    const id = `${pos}-${text}`;
    const heading = {
      id,
      level: level as 1 | 2 | 3 | 4,
      pos,
      text,
    };

    headings.push(heading);

    if (pos <= selectionFrom) {
      activeId = id;
    }

    return false;
  });

  return {
    activeId,
    headings,
  };
}

function jumpToHeading(editor: Editor, pos: number) {
  const targetPos = Math.min(pos + 1, editor.state.doc.content.size);

  editor.chain().focus().setTextSelection(targetPos).run();

  window.requestAnimationFrame(() => {
    const domNode = editor.view.nodeDOM(pos);
    const element = domNode instanceof HTMLElement ? domNode : domNode?.parentElement;

    if (element) {
      scrollElementToCenter(element);
    }
  });
}

function scrollElementToCenter(element: HTMLElement) {
  const scroller = getScrollContainer(element);
  const elementRect = element.getBoundingClientRect();

  if (!scroller) {
    const delta = elementRect.top + elementRect.height / 2 - window.innerHeight / 2;
    window.scrollBy({
      top: delta,
    });
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const delta =
    elementRect.top +
    elementRect.height / 2 -
    (scrollerRect.top + scrollerRect.height / 2);

  scroller.scrollTop += delta;
}

function getScrollContainer(element: HTMLElement) {
  let current = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY}${style.overflow}`);

    if (canScroll && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}
