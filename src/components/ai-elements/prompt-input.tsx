"use client";

import {
  type ComponentPropsWithoutRef,
  type FormEvent,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type PromptInputMessage = {
  text: string;
};

type PromptInputProps = Omit<ComponentPropsWithoutRef<"form">, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage) => void;
  text: string;
};

export function PromptInput({
  className,
  children,
  onSubmit,
  text,
  ...props
}: PromptInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      return;
    }

    onSubmit({ text });
  }

  return (
    <form
      className={cn(
        "border-t border-[var(--color-border)] bg-[var(--color-editor-header-background)] p-3",
        className,
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

export const PromptInputTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function PromptInputTextarea({
  className,
  onKeyDown,
  value,
  ...props
}, forwardedRef) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = ref.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }

    onKeyDown?.(event);
  }

  function setRefs(node: HTMLTextAreaElement | null) {
    ref.current = node;

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
      return;
    }

    if (forwardedRef) {
      forwardedRef.current = node;
    }
  }

  return (
    <textarea
      className={cn(
        "min-h-10 flex-1 resize-none border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-5 text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]",
        className,
      )}
      onKeyDown={handleKeyDown}
      ref={setRefs}
      rows={1}
      value={value}
      {...props}
    />
  );
});

export function PromptInputSubmit({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--color-primary)_38%,var(--color-border))] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-whisper)] transition hover:brightness-95 disabled:border-[var(--color-border)] disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)] disabled:shadow-none",
        className,
      )}
      type="submit"
      {...props}
    >
      {children ?? <Send aria-hidden="true" size={16} />}
    </button>
  );
}
