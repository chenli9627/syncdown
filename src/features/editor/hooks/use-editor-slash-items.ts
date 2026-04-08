"use client";

import { useMemo } from "react";
import { createSlashItems } from "@/features/editor/lib/menu-config";
import { filterSlashItems, getEnabledSlashItems } from "@/features/editor/lib/slash-menu";

export function useEditorSlashItems(query: string) {
  const slashItems = useMemo(() => createSlashItems(), []);
  const filteredSlashItems = useMemo(
    () => filterSlashItems(slashItems, query),
    [query, slashItems],
  );
  const enabledSlashItems = useMemo(
    () => getEnabledSlashItems(filteredSlashItems),
    [filteredSlashItems],
  );

  return {
    enabledSlashItems,
    filteredSlashItems,
  };
}
