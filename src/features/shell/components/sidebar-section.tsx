import { ChevronDown, Clock3, Ellipsis, FileLock2, PanelsTopLeft, Plus } from "lucide-react";
import type { DocumentRecord } from "@/features/app-state/types";

type SidebarSectionProps = {
  title: string;
  items: DocumentRecord[];
  onOpenItem?: (documentId: string) => void;
  onCreate?: () => void;
};

export function SidebarSection({
  title,
  items,
  onCreate,
  onOpenItem,
}: SidebarSectionProps) {
  const Icon =
    title === "Recents"
      ? Clock3
      : title === "Shared"
        ? PanelsTopLeft
        : FileLock2;
  const showCreate = title === "Private" && Boolean(onCreate);

  return (
    <section className="flex min-h-0 flex-col border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] shadow-[var(--shadow-whisper)]">
      <header className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[var(--color-muted-foreground)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {title}
          </h2>
          <ChevronDown className="size-3.5 text-[var(--color-muted-foreground)]" />
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          {showCreate ? (
            <button
              className="transition hover:text-[var(--color-foreground)]"
              onClick={onCreate}
              type="button"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
          <span>{items.length}</span>
          <Ellipsis className="size-4" />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid gap-1">
          {items.length ? (
            items.map((item) => (
              <button
                className="flex items-center justify-between px-2.5 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]"
                key={item.id}
                onClick={() => {
                  onOpenItem?.(item.id);
                }}
                type="button"
              >
                <span className="truncate">{item.title}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  <Ellipsis className="size-4" />
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-[var(--color-muted-foreground)]">
              No pages inside
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
