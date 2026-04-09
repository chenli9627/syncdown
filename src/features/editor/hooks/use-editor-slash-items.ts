"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { createSlashItems } from "@/features/editor/lib/menu-config";
import { filterSlashItems } from "@/features/editor/lib/slash-menu";

export function useEditorSlashItems(query: string) {
  const { t } = useLocale();
  const slashItems = useMemo(() => createSlashItems(t), [t]);
  const filteredSlashItems = useMemo(
    () => filterSlashItems(slashItems, query),
    [query, slashItems],
  );

  return {
    filteredSlashItems,
  };
}
