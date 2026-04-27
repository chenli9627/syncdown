"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import type { Editor, NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ListTree } from "lucide-react";
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
      className={`table-of-contents-block border bg-[var(--color-muted)] px-3.5 py-3 text-sm transition ${
        selected
          ? "border-[var(--color-primary)] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-[var(--color-border)]"
      }`}
      contentEditable={false}
      data-type="table-of-contents"
    >
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--color-muted-foreground)]">
        <ListTree className="size-3.5" />
        <span>{t("tableOfContents")}</span>
      </div>
      {outline.headings.length > 0 ? (
        <div className="space-y-0.5">
          {outline.headings.map((heading) => (
            <button
              className={`block w-full truncate py-0.5 pr-1 text-left leading-6 transition hover:text-[var(--color-primary)] ${
                outline.activeId === heading.id
                  ? "font-medium text-[var(--color-primary)]"
                  : "text-[var(--color-foreground)]"
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
                paddingLeft: `${(heading.level - 1) * 14}px`,
              }}
              type="button"
            >
              {heading.text}
            </button>
          ))}
        </div>
      ) : (
        <p className="m-0 text-[12px] leading-6 text-[var(--color-muted-foreground)]">
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

  editor.chain().focus().setTextSelection(targetPos).scrollIntoView().run();
}
