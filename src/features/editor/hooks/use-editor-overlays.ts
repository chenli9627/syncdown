"use client";

import { useEffect } from "react";

type BlockMenuState = {
  left: number;
  open: boolean;
  pos: number | null;
  showTurnInto: boolean;
  turnIntoAlign: "bottom" | "top";
  top: number;
};

type UseEditorOverlaysArgs = {
  blockMenu: BlockMenuState;
  blockMenuRef: React.RefObject<HTMLDivElement | null>;
  overflowButtonRef: React.RefObject<HTMLButtonElement | null>;
  overflowMenuOpen: boolean;
  overflowMenuRef: React.RefObject<HTMLDivElement | null>;
  permissionButtonRef: React.RefObject<HTMLButtonElement | null>;
  permissionMenuOpen: boolean;
  permissionMenuRef: React.RefObject<HTMLDivElement | null>;
  searchButtonRef: React.RefObject<HTMLButtonElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchMenuOpen: boolean;
  searchMenuRef: React.RefObject<HTMLDivElement | null>;
  setBlockMenu: (
    value:
      | BlockMenuState
      | ((current: BlockMenuState) => BlockMenuState),
  ) => void;
  setOverflowMenuOpen: (value: boolean) => void;
  setPermissionMenuOpen: (value: boolean) => void;
  setSearchMenuOpen: (value: boolean) => void;
};

export function useEditorOverlays({
  blockMenu,
  blockMenuRef,
  overflowButtonRef,
  overflowMenuOpen,
  overflowMenuRef,
  permissionButtonRef,
  permissionMenuOpen,
  permissionMenuRef,
  searchButtonRef,
  searchInputRef,
  searchMenuOpen,
  searchMenuRef,
  setBlockMenu,
  setOverflowMenuOpen,
  setPermissionMenuOpen,
  setSearchMenuOpen,
}: UseEditorOverlaysArgs) {
  useEffect(() => {
    if (!searchMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (searchButtonRef.current?.contains(target) || searchMenuRef.current?.contains(target)) {
        return;
      }

      setSearchMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [searchButtonRef, searchMenuOpen, searchMenuRef, setSearchMenuOpen]);

  useEffect(() => {
    if (!permissionMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        permissionButtonRef.current?.contains(target) ||
        permissionMenuRef.current?.contains(target)
      ) {
        return;
      }

      setPermissionMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    permissionButtonRef,
    permissionMenuOpen,
    permissionMenuRef,
    setPermissionMenuOpen,
  ]);

  useEffect(() => {
    if (!overflowMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        overflowButtonRef.current?.contains(target) ||
        overflowMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOverflowMenuOpen(false);
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [overflowButtonRef, overflowMenuOpen, overflowMenuRef, setOverflowMenuOpen]);

  useEffect(() => {
    if (!searchMenuOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [searchInputRef, searchMenuOpen]);

  useEffect(() => {
    if (!blockMenu.open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (blockMenuRef.current?.contains(target)) {
        return;
      }

      setBlockMenu({
        left: 0,
        open: false,
        pos: null,
        showTurnInto: false,
        turnIntoAlign: "top",
        top: 0,
      });
    }

    globalThis.document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [blockMenu.open, blockMenuRef, setBlockMenu]);
}
