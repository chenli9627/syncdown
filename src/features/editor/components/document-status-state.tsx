"use client";

type DocumentStatusStateProps = {
  description: string;
  title: string;
};

export function DocumentStatusState({
  description,
  title,
}: DocumentStatusStateProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_22%,transparent_42%)] px-8 py-12 text-center">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)] md:text-4xl">
          {title}
        </h1>
        <p className="text-base leading-7 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}
