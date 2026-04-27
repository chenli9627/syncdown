"use client";

import { useRef, useState } from "react";
import type { SearchRect } from "@/features/editor/lib/search";

export function useEditorSurfaceUiState() {
  const blockControlsRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const permissionButtonRef = useRef<HTMLButtonElement | null>(null);
  const permissionMenuRef = useRef<HTMLDivElement | null>(null);
  const editorKeyDownRef = useRef<(event: KeyboardEvent) => boolean>(() => false);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [searchMatchIndex, setSearchMatchIndex] = useState(-1);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [searchRects, setSearchRects] = useState<SearchRect[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"can_edit" | "can_view">("can_view");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [blockMenu, setBlockMenu] = useState({
    left: 0,
    open: false,
    pos: null as number | null,
    showTurnInto: false,
    turnIntoAlign: "top" as "bottom" | "top",
    top: 0,
  });

  return {
    actionError,
    actionNotice,
    blockControlsRef,
    blockMenu,
    blockMenuRef,
    editorContainerRef,
    editorKeyDownRef,
    imageInputRef,
    importInputRef,
    overflowButtonRef,
    overflowMenuOpen,
    overflowMenuRef,
    permissionBody: {
      permissionBusy,
      permissionError,
      permissionMenuOpen,
      permissionMenuRef,
      permissionNotice,
      permissionButtonRef,
      setPermissionBusy,
      setPermissionError,
      setPermissionMenuOpen,
      setPermissionNotice,
      setShareEmail,
      setSharePermission,
      shareEmail,
      sharePermission,
    },
    searchBody: {
      searchButtonRef,
      searchInputRef,
      searchMatchCount,
      searchMatchIndex,
      searchMenuOpen,
      searchMenuRef,
      searchNotice,
      searchQuery,
      searchRects,
      setSearchMatchCount,
      setSearchMatchIndex,
      setSearchMenuOpen,
      setSearchNotice,
      setSearchQuery,
      setSearchRects,
    },
    setActionError,
    setActionNotice,
    setBlockMenu,
    setOverflowMenuOpen,
    setStatus,
    status,
    versionHistoryBody: {
      selectedVersionId,
      setSelectedVersionId,
      setVersionHistoryOpen,
      versionHistoryOpen,
    },
  };
}
