"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Message({
  className,
  ...props
}: ComponentPropsWithoutRef<"article">) {
  return <article className={cn("group/message flex flex-col gap-2", className)} {...props} />;
}

export function MessageContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "max-w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-6 text-[var(--color-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function MessageResponse({
  className,
  children,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ai-message-markdown space-y-2 text-sm leading-6 text-[var(--color-foreground)]",
        className,
      )}
    >
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ className: linkClassName, ...props }) => (
          <a
            className={cn("underline underline-offset-2", linkClassName)}
            rel="noreferrer"
            target="_blank"
            {...props}
          />
        ),
        code: ({ className: codeClassName, ...props }) => (
          <code
            className={cn(
              "border border-[var(--color-border)] bg-[var(--color-muted)] px-1 py-0.5 text-[12px]",
              codeClassName,
            )}
            {...props}
          />
        ),
        pre: ({ className: preClassName, ...props }) => (
          <pre
            className={cn(
              "overflow-x-auto border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-[12px]",
              preClassName,
            )}
            {...props}
          />
        ),
        table: ({ className: tableClassName, ...props }) => (
          <div className="overflow-x-auto">
            <table className={cn("w-full border-collapse", tableClassName)} {...props} />
          </div>
        ),
        td: ({ className: cellClassName, ...props }) => (
          <td
            className={cn("border border-[var(--color-border)] px-2 py-1", cellClassName)}
            {...props}
          />
        ),
        th: ({ className: headClassName, ...props }) => (
          <th
            className={cn("border border-[var(--color-border)] px-2 py-1 text-left", headClassName)}
            {...props}
          />
        ),
      }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function MessageActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 opacity-0 transition group-hover/message:opacity-100 group-focus-within/message:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export function MessageAction({
  children,
  className,
  tooltip,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  children: ReactNode;
  tooltip?: string;
}) {
  return (
    <button
      className={cn(
        "group/action relative inline-flex h-7 w-7 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      title={tooltip}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
