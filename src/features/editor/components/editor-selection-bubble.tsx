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

const LINK_HOVER_GAP_PX = 0;
const LINK_HOVER_BRIDGE_HEIGHT_PX = 40;
const LINK_HOVER_BRIDGE_MIN_WIDTH_PX = 440;

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

  const closeHoverPopover = () => {
    if (hoverCloseTimeoutRef.current != null) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }

    setLinkPopover((current) =>
      current.mode === "hover" ? closedLinkPopover() : current,
    );
  };

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

    const closeEffectHoverPopover = () => {
      clearHoverCloseTimeout();
      setLinkPopover((current) =>
        current.mode === "hover" ? closedLinkPopover() : current,
      );
    };

    const scheduleHoverClose = () => {
      closeEffectHoverPopover();
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
          hoverBridge: {
            height: LINK_HOVER_BRIDGE_HEIGHT_PX,
            left: bounds.left + bounds.width / 2,
            top: Math.max(12, bounds.top - LINK_HOVER_BRIDGE_HEIGHT_PX),
            width: Math.max(bounds.width + 40, LINK_HOVER_BRIDGE_MIN_WIDTH_PX),
          },
          from: linkRange.from,
          href: anchor.getAttribute("href") ?? anchor.href,
          left: bounds.left + bounds.width / 2,
          mode: "hover",
          open: true,
          text: anchor.textContent ?? "",
          to: linkRange.to,
          top: Math.max(12, bounds.top - LINK_HOVER_GAP_PX),
        };
      });
    };

    const handleMouseLeave = (event: MouseEvent) => {
      if (isLinkHoverUiTarget(event.relatedTarget)) {
        return;
      }

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
      {linkPopover.open && linkPopover.mode === "hover" && linkPopover.hoverBridge ? (
        <div
          className="fixed z-[93]"
          data-link-hover-bridge="true"
          data-link-hover-ui="true"
          onMouseEnter={() => {
            if (hoverCloseTimeoutRef.current == null) {
              return;
            }

            window.clearTimeout(hoverCloseTimeoutRef.current);
            hoverCloseTimeoutRef.current = null;
          }}
          onMouseLeave={() => {
            closeHoverPopover();
          }}
          style={{
            height: `${linkPopover.hoverBridge.height}px`,
            left: `${linkPopover.hoverBridge.left}px`,
            top: `${linkPopover.hoverBridge.top}px`,
            transform: "translateX(-50%)",
            width: `${linkPopover.hoverBridge.width}px`,
          }}
        />
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

            closeHoverPopover();
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

function isLinkHoverUiTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest("[data-link-hover-ui='true']");
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
