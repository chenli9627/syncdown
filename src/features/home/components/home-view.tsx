"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function HomeView() {
  const router = useRouter();
  const { buckets, currentUser, openDocument } = useAppState();
  const recentDocuments = useMemo(() => buckets?.recents.slice(0, 4) ?? [], [buckets]);

  return (
    <div
      className="flex min-h-full flex-col p-8 md:p-10"
      style={{ background: "var(--color-page-gradient)" }}
    >
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          Home
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
          {getGreeting()}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)]">
          {currentUser
            ? `${currentUser.name} is inside the current workspace. Next phases will wire document permissions, editor state, and backend persistence.`
            : "The v2 shell is live."}
        </p>
      </div>

      {recentDocuments.length ? (
        <div className="mt-10 grid max-w-4xl gap-3 md:grid-cols-2">
          {recentDocuments.map((document) => (
            <button
              className="border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left shadow-[rgba(0,0,0,0.01)_0px_1px_3px] transition hover:bg-[var(--color-hover)]"
              key={document.id}
              onClick={async () => {
                const result = await openDocument(document.id);

                if (!result.ok) {
                  return;
                }

                router.push(`/documents/${document.id}`);
              }}
              type="button"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Recently visited
              </p>
              <p className="mt-2 text-lg font-semibold">{document.title}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
