"use client";

import type { Editor } from "@tiptap/react";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";

export type LinkPopoverMode = "edit" | "hover" | "insert";

export type LinkPopoverState = {
  from: number;
  href: string;
  left: number;
  mode: LinkPopoverMode;
  open: boolean;
  text: string;
  to: number;
  top: number;
};

type LinkPopoverProps = {
  linkPopover: LinkPopoverState;
  onClose: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onOpenEdit: () => void;
  onRemove: () => void;
  onSave: (href: string, text: string) => void;
};

export function LinkPopover({
  linkPopover,
  onClose,
  onHoverEnter,
  onHoverLeave,
  onOpenEdit,
  onRemove,
  onSave,
}: LinkPopoverProps) {
  return (
    <div
      className="fixed z-[94] w-[min(360px,calc(100vw-24px))] border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-[var(--shadow-soft-card)]"
      onMouseDown={preventContainerMouseDown}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      style={{
        left: `${linkPopover.left}px`,
        top: `${linkPopover.top}px`,
        transform:
          linkPopover.mode === "hover" ? "translate(-50%, -100%)" : "translateX(-50%)",
      }}
    >
      {linkPopover.mode === "hover" ? (
        <HoverLinkPopoverContent
          href={linkPopover.href}
          onOpenEdit={onOpenEdit}
          onRemove={onRemove}
        />
      ) : (
        <EditLinkPopoverContent
          initialHref={linkPopover.href}
          initialText={linkPopover.text}
          key={`${linkPopover.mode}:${linkPopover.from}:${linkPopover.to}:${linkPopover.href}:${linkPopover.text}`}
          mode={linkPopover.mode}
          onClose={onClose}
          onRemove={onRemove}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function HoverLinkPopoverContent({
  href,
  onOpenEdit,
  onRemove,
}: {
  href: string;
  onOpenEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <div className="truncate text-[12px] text-[var(--color-foreground)]" title={href}>
        {href}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-1 border border-[var(--color-border)] px-2 py-1 text-[12px] transition hover:bg-[var(--color-hover)]"
          onClick={() => {
            window.open(href, "_blank", "noopener,noreferrer");
          }}
          type="button"
        >
          <Link2 className="size-3.5" />
          {t("openLink")}
        </button>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 border border-[var(--color-border)] px-2 py-1 text-[12px] transition hover:bg-[var(--color-hover)]"
            onClick={onOpenEdit}
            type="button"
          >
            <Pencil className="size-3.5" />
            {t("editLink")}
          </button>
          <button
            className="flex items-center gap-1 border border-[var(--color-border)] px-2 py-1 text-[12px] transition hover:bg-[var(--color-hover)]"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="size-3.5" />
            {t("removeLink")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLinkPopoverContent({
  initialHref,
  initialText,
  mode,
  onClose,
  onRemove,
  onSave,
}: {
  initialHref: string;
  initialText: string;
  mode: LinkPopoverMode;
  onClose: () => void;
  onRemove: () => void;
  onSave: (href: string, text: string) => void;
}) {
  const { t } = useLocale();
  const [draftHref, setDraftHref] = useState(initialHref);
  const [draftText, setDraftText] = useState(initialText);

  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="text-[11px] text-[var(--color-muted-foreground)]">
          {t("linkAddress")}
        </span>
        <input
          className="w-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--color-ring)]"
          onChange={(event) => {
            setDraftHref(event.target.value);
          }}
          value={draftHref}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-[var(--color-muted-foreground)]">
          {t("linkText")}
        </span>
        <input
          className="w-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--color-ring)]"
          onChange={(event) => {
            setDraftText(event.target.value);
          }}
          value={draftText}
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <button
          className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
          onClick={onClose}
          type="button"
        >
          {t("discard")}
        </button>
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <button
              className="border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] transition hover:bg-[var(--color-hover)]"
              onClick={onRemove}
              type="button"
            >
              {t("removeLink")}
            </button>
          ) : null}
          <button
            className="bg-[var(--color-primary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-primary-foreground)] transition hover:brightness-95"
            onClick={() => {
              onSave(draftHref, draftText);
            }}
            type="button"
          >
            {t("saveLink")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function closedLinkPopover(): LinkPopoverState {
  return {
    from: 0,
    href: "",
    left: 0,
    mode: "hover",
    open: false,
    text: "",
    to: 0,
    top: 0,
  };
}

export function getLinkRange(editor: Editor, anchor: HTMLAnchorElement) {
  const textNodes = getAnchorTextNodes(anchor);

  if (textNodes.length === 0) {
    return null;
  }

  const firstTextNode = textNodes[0];
  const lastTextNode = textNodes[textNodes.length - 1];

  try {
    const from = editor.view.posAtDOM(firstTextNode, 0);
    const to = editor.view.posAtDOM(
      lastTextNode,
      lastTextNode.textContent?.length ?? 0,
    );

    return { from, to };
  } catch {
    return null;
  }
}

export function normalizeHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getAnchorTextNodes(anchor: HTMLAnchorElement) {
  const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof Text && currentNode.textContent) {
      textNodes.push(currentNode);
    }

    currentNode = walker.nextNode();
  }

  return textNodes;
}

function preventContainerMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
  event.preventDefault();
}
