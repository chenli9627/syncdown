import { Clock3, Ellipsis, FileLock2, PanelsTopLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import type { DocumentRecord } from "@/features/app-state/types";

type SidebarSectionKind = "private" | "recents" | "shared";

type SidebarSectionProps = {
  items: DocumentRecord[];
  kind: SidebarSectionKind;
  onCreate?: () => void;
  onOpenItem?: (documentId: string) => void;
  title: string;
};

const SHOW_OPTIONS = [5, 10, 15, 20];

function getSectionStorageKey(kind: SidebarSectionKind, suffix: "limit") {
  return `syncdown.sidebar.${kind}.${suffix}`;
}

export function SidebarSection({
  items,
  kind,
  onCreate,
  onOpenItem,
  title,
}: SidebarSectionProps) {
  const { t } = useLocale();
  const Icon = kind === "recents" ? Clock3 : kind === "shared" ? PanelsTopLeft : FileLock2;
  const showCreate = kind === "private" && Boolean(onCreate);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window === "undefined") {
      return 10;
    }

    const savedLimit = Number(window.localStorage.getItem(getSectionStorageKey(kind, "limit")));
    return SHOW_OPTIONS.includes(savedLimit) ? savedLimit : 10;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(getSectionStorageKey(kind, "limit"), String(visibleCount));
  }, [kind, visibleCount]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  return (
    <section className="flex min-h-0 flex-col border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] shadow-[var(--shadow-whisper)]">
      <header className="flex items-center justify-between px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-left">
          <Icon className="size-4 text-[var(--color-muted-foreground)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {title}
          </h2>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          {showCreate ? (
            <button
              className="transition hover:text-[var(--color-foreground)]"
              onClick={onCreate}
              title={t("newDocument")}
              type="button"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
          <button
            className="min-w-6 text-right transition hover:text-[var(--color-foreground)]"
            onClick={() => {
              setMenuOpen((current) => !current);
            }}
            title={t("showItems")}
            type="button"
          >
            {Math.min(items.length, visibleCount)}
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-20 w-[132px] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-soft-card)]"
              ref={menuRef}
            >
              {SHOW_OPTIONS.map((option) => (
                <button
                  className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] transition ${
                    visibleCount === option
                      ? "bg-[var(--color-hover)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                  }`}
                  key={option}
                  onClick={() => {
                    setVisibleCount(option);
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>{t("showItems")}</span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid gap-1">
          {visibleItems.length ? (
            visibleItems.map((item) => (
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
              {t("noPagesInside")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
