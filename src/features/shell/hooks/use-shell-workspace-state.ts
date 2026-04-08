"use client";

import { useEffect, useRef, useState } from "react";

export function useShellWorkspaceState() {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const workspaceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const createWorkspaceButtonRef = useRef<HTMLButtonElement | null>(null);
  const createWorkspacePopoverRef = useRef<HTMLFormElement | null>(null);
  const workspaceSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const workspaceSettingsPopoverRef = useRef<HTMLDivElement | null>(null);

  function closeWorkspacePopovers() {
    setWorkspaceMenuOpen(false);
    setShowCreateWorkspace(false);
    setShowWorkspaceSettings(false);
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        workspaceMenuOpen &&
        !workspaceTriggerRef.current?.contains(target) &&
        !workspaceMenuRef.current?.contains(target)
      ) {
        closeWorkspacePopovers();
        return;
      }
      if (
        showCreateWorkspace &&
        !createWorkspaceButtonRef.current?.contains(target) &&
        !createWorkspacePopoverRef.current?.contains(target)
      ) {
        setShowCreateWorkspace(false);
      }
      if (
        showWorkspaceSettings &&
        !workspaceSettingsButtonRef.current?.contains(target) &&
        !workspaceSettingsPopoverRef.current?.contains(target)
      ) {
        setShowWorkspaceSettings(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showCreateWorkspace, showWorkspaceSettings, workspaceMenuOpen]);

  return {
    closeWorkspacePopovers,
    createWorkspaceButtonRef,
    createWorkspacePopoverRef,
    deleteConfirmName,
    isWorking,
    renameWorkspaceName,
    setDeleteConfirmName,
    setIsWorking,
    setRenameWorkspaceName,
    setShowCreateWorkspace,
    setShowWorkspaceSettings,
    setWorkspaceError,
    setWorkspaceMenuOpen,
    setWorkspaceName,
    setWorkspaceNotice,
    showCreateWorkspace,
    showWorkspaceSettings,
    workspaceError,
    workspaceMenuOpen,
    workspaceMenuRef,
    workspaceName,
    workspaceNotice,
    workspaceSettingsButtonRef,
    workspaceSettingsPopoverRef,
    workspaceTriggerRef,
  };
}
