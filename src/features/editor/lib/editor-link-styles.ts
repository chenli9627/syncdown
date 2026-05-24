export const EDITOR_LINK_CLASS =
  "editor-link !text-[var(--color-muted-foreground)] underline underline-offset-2 decoration-[color-mix(in_srgb,var(--color-muted-foreground)_38%,transparent)] transition hover:!text-[var(--color-foreground)]";

export const MANUAL_TOC_LIST_CLASS = "m-0 list-none pl-0";

export const MANUAL_TOC_ITEM_CLASS = "m-0 p-0";

export const MANUAL_TOC_LINK_CLASS =
  "manual-toc-link block w-full truncate py-[1px] pr-1 text-left text-[15px] leading-7 !text-[var(--color-muted-foreground)] underline decoration-[color-mix(in_srgb,var(--color-muted-foreground)_38%,transparent)] underline-offset-[3px] transition hover:bg-[var(--color-hover)] hover:!text-[var(--color-foreground)]";

export function decorateManualTocLists(root: ParentNode) {
  const manualTocLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('li > p > a.editor-link.block[href^="#"]'),
  );

  for (const link of manualTocLinks) {
    const listItem = link.closest("li");
    const list = link.closest("ul, ol");

    if (listItem) {
      listItem.style.margin = "0";
      listItem.style.padding = "0";
    }

    if (list) {
      list.style.margin = "0";
      list.style.paddingLeft = "0";
      list.style.listStyle = "none";
    }
  }
}
