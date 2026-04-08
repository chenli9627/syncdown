"use client";

import type { RefObject } from "react";
import { EditorSearchPopover } from "@/features/editor/components/editor-search-popover";

type EditorHeaderSearchActionProps = {
  onCloseOtherMenus: () => void;
  onNext: () => void;
  onPrevious: () => void;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  searchHeaderLabel: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchMenuOpen: boolean;
  searchMenuRef: RefObject<HTMLDivElement | null>;
  searchNotice: string | null;
  searchQuery: string;
  setOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setSearchMatchCount: (value: number) => void;
  setSearchMatchIndex: (value: number) => void;
  setSearchNotice: (value: string | null) => void;
  setSearchQuery: (value: string) => void;
  setSearchRects: (value: []) => void;
};

function handleSearchChange(
  value: string,
  props: Pick<
    EditorHeaderSearchActionProps,
    | "setSearchMatchCount"
    | "setSearchMatchIndex"
    | "setSearchNotice"
    | "setSearchQuery"
    | "setSearchRects"
  >,
) {
  props.setSearchRects([]);
  props.setSearchMatchCount(0);
  props.setSearchMatchIndex(-1);
  props.setSearchNotice(null);
  props.setSearchQuery(value);
}

export function EditorHeaderSearchAction(props: EditorHeaderSearchActionProps) {
  return (
    <EditorSearchPopover
      onCloseOtherMenus={props.onCloseOtherMenus}
      onNext={props.onNext}
      onPrevious={props.onPrevious}
      onSearchChange={(value) => handleSearchChange(value, props)}
      open={props.searchMenuOpen}
      searchButtonRef={props.searchButtonRef}
      searchHeaderLabel={props.searchHeaderLabel}
      searchInputRef={props.searchInputRef}
      searchMenuRef={props.searchMenuRef}
      searchNotice={props.searchNotice}
      searchQuery={props.searchQuery}
      setOpen={props.setOpen}
    />
  );
}
