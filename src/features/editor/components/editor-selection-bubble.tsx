"use client";

import type { Editor } from "@tiptap/react";
import { Bold, Code2, Italic, Link2, Sparkles, Strikethrough } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/locale-provider";
import {
  closedLinkPopover,
  getLinkRange,
  LinkPopover,
  type LinkPopoverState,
  normalizeHref,
} from "@/features/editor/components/editor-link-popover";
import type { SelectionBubbleState } from "@/features/editor/lib/types";
type EditorSelectionBubbleProps = {
  editor: Editor | null;
  onFormat: (command: "bold" | "italic" | "strike" | "code") => void;
  onOpenAi: () => void;
  selectionBubble: SelectionBubbleState;
  selectionBubbleRef: RefObject<HTMLDivElement | null>;
};

export function EditorSelectionBubble({
  editor,
  onFormat,
  onOpenAi,
  selectionBubble,
  selectionBubbleRef,
}: EditorSelectionBubbleProps) {
  const { t } = useLocale();
  const hoverCloseTimeoutRef = useRef<number | null>(null);
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState>(closedLinkPopover);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorElement = editor.view.dom;
    const clearHoverCloseTimeout = () => {
      if (hoverCloseTimeoutRef.current == null) {
        return;
      }

      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    };

    const scheduleHoverClose = () => {
      clearHoverCloseTimeout();
      hoverCloseTimeoutRef.current = window.setTimeout(() => {
        setLinkPopover((current) =>
          current.mode === "hover" ? closedLinkPopover() : current,
        );
      }, 140);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (selectionBubble.open) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        scheduleHoverClose();
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        scheduleHoverClose();
        return;
      }

      const linkRange = getLinkRange(editor, anchor);

      if (!linkRange) {
        scheduleHoverClose();
        return;
      }

      clearHoverCloseTimeout();
      const bounds = anchor.getBoundingClientRect();
      setLinkPopover((current) => {
        if (current.mode === "edit") {
          return current;
        }

        return {
          from: linkRange.from,
          href: anchor.getAttribute("href") ?? anchor.href,
          left: bounds.left + bounds.width / 2,
          mode: "hover",
          open: true,
          text: anchor.textContent ?? "",
          to: linkRange.to,
          top: Math.max(12, bounds.top - 10),
        };
      });
    };

    const handleMouseLeave = () => {
      scheduleHoverClose();
    };

    editorElement.addEventListener("mousemove", handleMouseMove);
    editorElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearHoverCloseTimeout();
      editorElement.removeEventListener("mousemove", handleMouseMove);
      editorElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, selectionBubble.open]);

  if (!selectionBubble.open && !linkPopover.open) {
    return null;
  }

  if (!globalThis.document?.body) {
    return null;
  }

  return createPortal(
    <>
      {selectionBubble.open ? (
        <div
          className="fixed z-[92] flex items-center gap-0.5 border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 shadow-[var(--shadow-soft-card)]"
          ref={selectionBubbleRef}
          style={{
            left: `${selectionBubble.left}px`,
            top: `${selectionBubble.top}px`,
            transform: "translateX(-50%)",
          }}
        >
          <SelectionActionButton
            active={Boolean(editor?.isActive("bold"))}
            icon={<Bold className="size-4" />}
            label={t("bold")}
            onClick={() => onFormat("bold")}
          />
          <SelectionActionButton
            active={Boolean(editor?.isActive("italic"))}
            icon={<Italic className="size-4" />}
            label={t("italic")}
            onClick={() => onFormat("italic")}
          />
          <SelectionActionButton
            active={Boolean(editor?.isActive("strike"))}
            icon={<Strikethrough className="size-4" />}
            label={t("strike")}
            onClick={() => onFormat("strike")}
          />
          <SelectionActionButton
            active={Boolean(editor?.isActive("code"))}
            icon={<Code2 className="size-4" />}
            label={t("code")}
            onClick={() => onFormat("code")}
          />
          <SelectionActionButton
            active={Boolean(editor?.isActive("link"))}
            icon={<Link2 className="size-4" />}
            label={t("link")}
            onClick={() => {
              if (!editor) {
                return;
              }

              const currentHref = editor.getAttributes("link").href as string | undefined;
              setLinkPopover({
                from: selectionBubble.from,
                href: currentHref ?? "",
                left: selectionBubble.left,
                mode: "insert",
                open: true,
                text: selectionBubble.text,
                to: selectionBubble.to,
                top: selectionBubble.top + 44,
              });
            }}
          />
          <SelectionActionButton
            icon={<Sparkles className="size-4" />}
            label={t("ai")}
            onClick={onOpenAi}
          />
        </div>
      ) : null}
      {linkPopover.open ? (
        <LinkPopover
          linkPopover={linkPopover}
          onClose={() => {
            setLinkPopover(closedLinkPopover());
          }}
          onHoverEnter={() => {
            if (hoverCloseTimeoutRef.current == null) {
              return;
            }
            window.clearTimeout(hoverCloseTimeoutRef.current);
            hoverCloseTimeoutRef.current = null;
          }}
          onHoverLeave={() => {
            if (linkPopover.mode !== "hover") {
              return;
            }

            hoverCloseTimeoutRef.current = window.setTimeout(() => {
              setLinkPopover(closedLinkPopover());
            }, 120);
          }}
          onOpenEdit={() => {
            setLinkPopover((current) => ({
              ...current,
              mode: "edit",
            }));
          }}
          onRemove={() => {
            if (!editor) {
              return;
            }

            editor
              .chain()
              .focus()
              .setTextSelection({ from: linkPopover.from, to: linkPopover.to })
              .unsetLink()
              .run();
            setLinkPopover(closedLinkPopover());
          }}
          onSave={(href, text) => {
            if (!editor) {
              return;
            }

            const normalizedHref = normalizeHref(href);

            if (!normalizedHref) {
              return;
            }

            editor
              .chain()
              .focus()
              .insertContentAt(
                { from: linkPopover.from, to: linkPopover.to },
                {
                  marks: [
                    {
                      attrs: {
                        href: normalizedHref,
                        rel: "noopener noreferrer nofollow",
                        target: "_blank",
                      },
                      type: "link",
                    },
                  ],
                  text: text || linkPopover.text || normalizedHref,
                  type: "text",
                },
              )
              .run();
            setLinkPopover(closedLinkPopover());
          }}
        />
      ) : null}
    </>,
    globalThis.document.body,
  );
}

function SelectionActionButton({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center transition ${
        active
          ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
      }`}
      onClick={onClick}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
