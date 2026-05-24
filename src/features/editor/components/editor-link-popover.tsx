"use client";

import type { Editor } from "@tiptap/react";
import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";

export type LinkPopoverMode = "edit" | "hover" | "insert";

export type LinkPopoverState = {
  hoverBridge:
    | {
        height: number;
        left: number;
        top: number;
        width: number;
      }
    | null;
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
  const hoverCard = linkPopover.mode === "hover";
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(() => getPopoverPosition(linkPopover, hoverCard));

  useLayoutEffect(() => {
    const updatePosition = () => {
      setPosition(getPopoverPosition(linkPopover, hoverCard, popoverRef.current));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [hoverCard, linkPopover]);

  return (
    <div
      className={`fixed z-[94] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft-card)] ${
        hoverCard
          ? "w-[400px] max-w-[calc(100vw-20px)] px-2 py-1.5"
          : "w-[min(360px,calc(100vw-24px))] p-2.5"
      }`}
      data-link-hover-ui="true"
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onPointerDown={stopPopoverPointerDown}
      ref={popoverRef}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
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

function getPopoverPosition(
  linkPopover: LinkPopoverState,
  hoverCard: boolean,
  element?: HTMLDivElement | null,
) {
  const screenPadding = 8;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const fallbackWidth = hoverCard ? 400 : 360;
  const fallbackHeight = hoverCard ? 40 : 178;
  const width = element?.offsetWidth || Math.min(fallbackWidth, viewportWidth - 24);
  const height = element?.offsetHeight || fallbackHeight;
  const halfWidth = width / 2;
  const left = Math.min(
    viewportWidth - halfWidth - screenPadding,
    Math.max(halfWidth + screenPadding, linkPopover.left),
  );
  const preferredTop = hoverCard ? linkPopover.top - height : linkPopover.top;
  const top =
    preferredTop + height > viewportHeight - screenPadding
      ? Math.max(screenPadding, linkPopover.top - height - (hoverCard ? 0 : 56))
      : Math.max(screenPadding, preferredTop);

  return { left, top };
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
    <div className="flex items-center gap-1.5">
      <button
        className="min-w-0 flex-1 truncate border border-[var(--color-border)] px-2 py-1 text-left text-[12px] text-[var(--color-primary)] transition hover:bg-[var(--color-hover)]"
        onClick={() => {
          const resolvedHref = resolveHrefForNavigation(href);

          if (!resolvedHref) {
            return;
          }

          window.open(resolvedHref, "_blank", "noopener,noreferrer");
        }}
        title={href}
        type="button"
      >
        {href}
      </button>
      <HoverLinkActionButton
        label={t("copyLink")}
        onClick={() => {
          void navigator.clipboard.writeText(href);
        }}
      />
      <HoverLinkActionButton label={t("editLink")} onClick={onOpenEdit} />
      <HoverLinkActionButton label={t("removeLink")} onClick={onRemove} />
    </div>
  );
}

function HoverLinkActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="shrink-0 border border-[var(--color-border)] px-2 py-1 text-[12px] transition hover:bg-[var(--color-hover)]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
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
    hoverBridge: null,
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
  return value.trim();
}

export function getPreferredLinkText(
  draftText: string,
  existingText: string,
  draftHref: string,
) {
  const trimmedText = draftText.trim();

  if (trimmedText) {
    return trimmedText;
  }

  if (existingText) {
    return existingText;
  }

  return draftHref.trim();
}

export function resolveHrefForNavigation(href: string) {
  const trimmed = href.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) {
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

function stopPopoverPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
  event.stopPropagation();
}
