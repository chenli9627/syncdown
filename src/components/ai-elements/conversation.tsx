"use client";

import { ArrowDown } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export function Conversation({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

export function ConversationContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [children]);

  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
}

export function ConversationEmptyState({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-full items-center justify-center px-6 text-center text-sm text-[var(--color-muted-foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ConversationScrollButton({
  className,
  children,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & { children?: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollingElement = document.scrollingElement;

      if (!scrollingElement) {
        return;
      }

      const distanceFromBottom =
        scrollingElement.scrollHeight -
        scrollingElement.scrollTop -
        scrollingElement.clientHeight;
      setVisible(distanceFromBottom > 180);
    };

    handleScroll();
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      className={cn(
        "absolute bottom-24 right-5 inline-flex h-8 w-8 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        document.scrollingElement?.scrollTo({
          top: document.scrollingElement.scrollHeight,
          behavior: "smooth",
        });
      }}
      type="button"
      {...props}
    >
      {children ?? <ArrowDown aria-hidden="true" size={15} />}
    </button>
  );
}
