"use client";

import { ArrowRightLeft, ChevronRight, Copy, Download, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { BlockTransformItem } from "@/features/editor/lib/types";

type EditorBlockMenuProps = {
  blockMenuLeft: number;
  blockMenuOpen: boolean;
  blockMenuRef: RefObject<HTMLDivElement | null>;
  blockMenuTop: number;
  blockTransformItems: BlockTransformItem[];
  canEditBody: boolean;
  currentTransformActiveId: string | null;
  handleDeleteBlock: () => void;
  handleDeleteTable: () => void;
  handleDownloadImage: () => void;
  handleDuplicateBlock: () => void;
  handleTurnInto: (item: BlockTransformItem) => void;
  isImageBlock: boolean;
  isTableBlock: boolean;
  isTableOfContentsBlock: boolean;
  setBlockMenu: (
    value:
      | {
          left: number;
          open: boolean;
          pos: number | null;
          showTurnInto: boolean;
          turnIntoAlign: "bottom" | "top";
          top: number;
        }
      | ((current: {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            turnIntoAlign: "bottom" | "top";
            top: number;
          }) => {
            left: number;
            open: boolean;
            pos: number | null;
            showTurnInto: boolean;
            turnIntoAlign: "bottom" | "top";
            top: number;
          }),
  ) => void;
  showTurnInto: boolean;
  turnIntoAlign: "bottom" | "top";
};

export function EditorBlockMenu({
  blockMenuLeft,
  blockMenuOpen,
  blockMenuRef,
  blockMenuTop,
  blockTransformItems,
  canEditBody,
  currentTransformActiveId,
  handleDeleteBlock,
  handleDeleteTable,
  handleDownloadImage,
  handleDuplicateBlock,
  handleTurnInto,
  isImageBlock,
  isTableBlock,
  isTableOfContentsBlock,
  setBlockMenu,
  showTurnInto,
  turnIntoAlign,
}: EditorBlockMenuProps) {
  const { t } = useLocale();
  if (!canEditBody || !blockMenuOpen || !globalThis.document?.body) {
    return null;
  }

  return (
    <div
      className="fixed z-[90] w-[168px] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
      ref={blockMenuRef}
      style={{
        left: `${blockMenuLeft}px`,
        top: `${blockMenuTop}px`,
      }}
    >
      {!isImageBlock && !isTableBlock && !isTableOfContentsBlock ? (
        <div
          className="relative"
          onMouseEnter={() => {
            setBlockMenu((current) => ({
              ...current,
              showTurnInto: true,
            }));
          }}
          onMouseLeave={() => {
            setBlockMenu((current) => ({
              ...current,
              showTurnInto: false,
            }));
          }}
        >
          <button
            className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ArrowRightLeft className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span>{t("turnInto")}</span>
            </span>
            <ChevronRight
              className={`size-3.5 shrink-0 text-[var(--color-muted-foreground)] transition ${
                showTurnInto ? "translate-x-0.5" : ""
              }`}
            />
          </button>
          {showTurnInto ? (
            <div
              className={`absolute left-full z-[91] max-h-[320px] w-[168px] overflow-y-auto border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)] ${
                turnIntoAlign === "bottom" ? "bottom-0" : "top-0"
              }`}
            >
              {blockTransformItems.map((item) => {
                const isCurrent = currentTransformActiveId === item.id;

                return (
                  <button
                    className={`flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] transition ${
                      isCurrent
                        ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                        : "text-[var(--color-foreground)] hover:bg-[var(--color-hover)]"
                    }`}
                    key={item.id}
                    onClick={() => {
                      handleTurnInto(item);
                    }}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      {isCurrent ? t("currentStatus") : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {!isTableOfContentsBlock ? (
        <button
          className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
          onClick={handleDuplicateBlock}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Copy className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span>{t("duplicate")}</span>
          </span>
        </button>
      ) : null}
      {isTableBlock ? (
        <>
          <button
            className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] text-[#b44c07] transition hover:bg-[var(--color-hover)]"
            onClick={handleDeleteTable}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Trash2 className="size-3.5 shrink-0" />
              <span>{t("deleteTable")}</span>
            </span>
          </button>
        </>
      ) : isImageBlock ? (
        <>
          <button
            className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] text-[var(--color-foreground)] transition hover:bg-[var(--color-hover)]"
            onClick={handleDownloadImage}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Download className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span>{t("download")}</span>
            </span>
          </button>
        </>
      ) : null}
      <button
        className="flex w-full items-center justify-between gap-2.5 px-2 py-1.5 text-left text-[12px] text-[#b44c07] transition hover:bg-[var(--color-hover)]"
        onClick={handleDeleteBlock}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Trash2 className="size-3.5 shrink-0" />
          <span>{t("delete")}</span>
        </span>
      </button>
    </div>
  );
}
