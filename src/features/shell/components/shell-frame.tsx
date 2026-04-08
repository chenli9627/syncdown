"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { ShellSidebar } from "@/features/shell/components/shell-sidebar";

type ShellFrameProps = {
  children: ReactNode;
};

export function ShellFrame({ children }: ShellFrameProps) {
  const router = useRouter();
  const {
    accessibleWorkspaces,
    buckets,
    createDocument,
    createWorkspace,
    currentUser,
    currentWorkspace,
    deleteCurrentWorkspace,
    logout,
    openDocument,
    renameCurrentWorkspace,
    ready,
    switchWorkspace,
  } = useAppState();
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
    if (!ready) {
      return;
    }

    if (!currentUser) {
      router.replace("/login");
    }
  }, [currentUser, ready, router]);

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

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showCreateWorkspace, showWorkspaceSettings, workspaceMenuOpen]);

  if (!ready || !currentUser || !currentWorkspace || !buckets) {
    return null;
  }

  const canManageCurrentWorkspace = currentWorkspace.ownerUserId === currentUser.id;
  const guestBadgeClass =
    "shrink-0 rounded-full border border-[#f0d9a7] bg-[#fbefcf] px-2 py-0.5 text-[11px] font-semibold text-[#c98a10]";

  async function handleOpenDocument(documentId: string) {
    const result = await openDocument(documentId);

    if (!result.ok) {
      return;
    }

    router.push(`/documents/${documentId}`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <div className="grid h-screen w-full grid-cols-1 bg-[var(--color-card)] md:grid-cols-[272px_minmax(0,1fr)]">
        <ShellSidebar
          accessibleWorkspaces={accessibleWorkspaces}
          buckets={buckets}
          canManageCurrentWorkspace={canManageCurrentWorkspace}
          closeWorkspacePopovers={closeWorkspacePopovers}
          createDocument={createDocument}
          createWorkspaceButtonRef={createWorkspaceButtonRef}
          createWorkspacePopoverRef={createWorkspacePopoverRef}
          currentUser={currentUser}
          currentWorkspace={currentWorkspace}
          deleteConfirmName={deleteConfirmName}
          guestBadgeClass={guestBadgeClass}
          handleOpenDocument={handleOpenDocument}
          isWorking={isWorking}
          onCreateWorkspace={async () => {
            setWorkspaceError(null);
            setWorkspaceNotice(null);
            setIsWorking(true);
            const result = await createWorkspace(workspaceName);
            setIsWorking(false);
            if (!result.ok) {
              setWorkspaceError(result.error);
              return;
            }
            setWorkspaceName("");
            closeWorkspacePopovers();
          }}
          onDeleteConfirmNameChange={setDeleteConfirmName}
          onDeleteWorkspace={async () => {
            setWorkspaceError(null);
            setWorkspaceNotice(null);
            setIsWorking(true);
            const result = await deleteCurrentWorkspace(deleteConfirmName);
            setIsWorking(false);
            if (!result.ok) {
              setWorkspaceError(result.error);
              return;
            }
            closeWorkspacePopovers();
          }}
          onHomeSettingsToggle={() => {
            setRenameWorkspaceName(currentWorkspace.name);
            setDeleteConfirmName("");
            setShowWorkspaceSettings((current) => !current);
            setWorkspaceMenuOpen(false);
            setShowCreateWorkspace(false);
            setWorkspaceError(null);
            setWorkspaceNotice(null);
          }}
          onLogout={() => {
            logout();
            setWorkspaceMenuOpen(false);
            router.push("/login");
          }}
          onOpenSettings={() => {
            setWorkspaceNotice("Profile settings will land in the next stage.");
            setWorkspaceError(null);
          }}
          onRenameWorkspace={async () => {
            setWorkspaceError(null);
            setWorkspaceNotice(null);
            setIsWorking(true);
            const result = await renameCurrentWorkspace(renameWorkspaceName);
            setIsWorking(false);
            if (!result.ok) {
              setWorkspaceError(result.error);
              return;
            }
            setWorkspaceNotice("Workspace renamed");
            setShowWorkspaceSettings(false);
          }}
          onRenameWorkspaceNameChange={setRenameWorkspaceName}
          onSelectWorkspace={(workspaceId) => {
            switchWorkspace(workspaceId);
            router.push("/home");
          }}
          onShowCreateWorkspaceChange={(value) => {
            setShowCreateWorkspace((current) =>
              typeof value === "function" ? value(current) : value,
            );
            setShowWorkspaceSettings(false);
          }}
          onToggleWorkspaceMenu={() => {
            setWorkspaceMenuOpen((current) => {
              const next = !current;
              if (!next) {
                setShowCreateWorkspace(false);
                setShowWorkspaceSettings(false);
              }
              return next;
            });
          }}
          onTrashOpen={() => {
            router.push("/trash");
          }}
          onWorkspaceDocumentCreated={(documentId) => {
            router.push(`/documents/${documentId}`);
          }}
          renameWorkspaceName={renameWorkspaceName}
          setWorkspaceError={setWorkspaceError}
          setWorkspaceName={setWorkspaceName}
          setWorkspaceNotice={setWorkspaceNotice}
          showCreateWorkspace={showCreateWorkspace}
          showWorkspaceSettings={showWorkspaceSettings}
          workspaceError={workspaceError}
          workspaceMenuOpen={workspaceMenuOpen}
          workspaceMenuRef={workspaceMenuRef}
          workspaceName={workspaceName}
          workspaceNotice={workspaceNotice}
          workspaceSettingsButtonRef={workspaceSettingsButtonRef}
          workspaceSettingsPopoverRef={workspaceSettingsPopoverRef}
          workspaceTriggerRef={workspaceTriggerRef}
        />

        <main className="relative z-0 h-screen min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#fdfcfb_100%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
