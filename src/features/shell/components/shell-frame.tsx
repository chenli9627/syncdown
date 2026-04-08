"use client";

import type { ReactNode } from "react";
import { ChevronDown, House, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import { SidebarSection } from "@/features/shell/components/sidebar-section";

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

  const isGuest = currentWorkspace.ownerUserId !== currentUser.id;
  const canManageCurrentWorkspace = currentWorkspace.ownerUserId === currentUser.id;
  const topCardAvatar = currentWorkspace.name.slice(0, 1).toUpperCase();
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
        <aside className="relative z-20 flex h-screen min-h-0 flex-col overflow-visible border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-2.5 text-[var(--color-sidebar-foreground)]">
          <div className="relative z-30">
            <button
              className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 py-3 text-left shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-card)]"
              ref={workspaceTriggerRef}
              onClick={() => {
                setWorkspaceMenuOpen((current) => {
                  const next = !current;

                  if (!next) {
                    setShowCreateWorkspace(false);
                    setShowWorkspaceSettings(false);
                  }

                  return next;
                });
              }}
              type="button"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)]">
                {topCardAvatar}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="truncate text-[15px] font-semibold">
                  {currentWorkspace.name}
                </p>
                {isGuest ? (
                  <span className={guestBadgeClass}>
                    Guest
                  </span>
                ) : null}
              </div>
              <ChevronDown className="size-4 text-[var(--color-muted-foreground)]" />
            </button>

            {workspaceMenuOpen ? (
              <div
                className="absolute left-0 top-[calc(100%+8px)] z-[80] w-full border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
                ref={workspaceMenuRef}
              >
                <div className="max-h-60 overflow-y-auto">
                  {accessibleWorkspaces.map((workspace) => (
                    <button
                      className="flex w-full items-center justify-between px-2 py-2 text-left text-sm transition hover:bg-[var(--color-hover)]"
                      key={workspace.id}
                      onClick={() => {
                        switchWorkspace(workspace.id);
                        closeWorkspacePopovers();
                        router.push("/home");
                      }}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{workspace.name}</span>
                        {workspace.ownerUserId !== currentUser.id ? (
                          <span className={guestBadgeClass}>
                            Guest
                          </span>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                        {workspace.id === currentWorkspace.id ? "current" : ""}
                      </div>
                    </button>
                  ))}
                </div>
                {workspaceError ? (
                  <p className="mt-3 text-sm text-[#dd5b00]">{workspaceError}</p>
                ) : null}
                {workspaceNotice ? (
                  <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                    {workspaceNotice}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                  <div className="space-y-2">
                    <div className="relative">
                      <button
                        className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                        ref={createWorkspaceButtonRef}
                        onClick={() => {
                          setWorkspaceName("");
                          setShowCreateWorkspace((current) => !current);
                          setShowWorkspaceSettings(false);
                          setWorkspaceError(null);
                          setWorkspaceNotice(null);
                        }}
                        type="button"
                      >
                        <span>Create workspace</span>
                        <Plus className="size-4" />
                      </button>

                      {showCreateWorkspace ? (
                        <form
                          className="absolute left-[calc(100%+8px)] top-1/2 z-[90] w-[272px] -translate-y-1/2 space-y-2 border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
                          onSubmit={async (event) => {
                            event.preventDefault();
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
                          ref={createWorkspacePopoverRef}
                        >
                          <label
                            className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                            htmlFor="workspace-name"
                          >
                            New workspace
                          </label>
                          <input
                            className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                            id="workspace-name"
                            onChange={(event) => {
                              setWorkspaceName(event.target.value);
                            }}
                            placeholder="Workspace name"
                            value={workspaceName}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="rounded-[4px] px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                              onClick={() => {
                                setShowCreateWorkspace(false);
                                setWorkspaceName("");
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              className="rounded-[4px] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95"
                              disabled={isWorking}
                              type="submit"
                            >
                              Create
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                    onClick={() => {
                      setWorkspaceNotice("Profile settings will land in the next stage.");
                      setWorkspaceError(null);
                    }}
                    type="button"
                  >
                    <span>Settings</span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between border border-transparent px-2 py-2 text-left text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                    onClick={() => {
                      logout();
                      setWorkspaceMenuOpen(false);
                      router.push("/login");
                    }}
                    type="button"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 border border-transparent bg-[var(--color-sidebar-panel)] px-3.5 py-3 text-sm font-medium shadow-[var(--shadow-whisper)]">
                <Link
                  className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-[var(--color-foreground)]"
                  href="/home"
                >
                  <House className="size-4 text-[var(--color-muted-foreground)]" />
                  Home
                </Link>
                {canManageCurrentWorkspace ? (
                  <>
                    <button
                      className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                      title="New document"
                      onClick={async () => {
                        const result = await createDocument();

                        if (!result.ok) {
                          return;
                        }

                        router.push(`/documents/${result.documentId}`);
                      }}
                      type="button"
                    >
                      <Plus className="size-4" />
                    </button>
                    <button
                      className="flex size-8 items-center justify-center text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                      ref={workspaceSettingsButtonRef}
                      title="Workspace settings"
                      onClick={() => {
                        setRenameWorkspaceName(currentWorkspace.name);
                        setDeleteConfirmName("");
                        setShowWorkspaceSettings((current) => !current);
                        setWorkspaceMenuOpen(false);
                        setShowCreateWorkspace(false);
                        setWorkspaceError(null);
                        setWorkspaceNotice(null);
                      }}
                      type="button"
                    >
                      <Settings2 className="size-4" />
                    </button>
                  </>
                ) : null}
              </div>

              {showWorkspaceSettings && canManageCurrentWorkspace ? (
                <div
                  className="absolute left-[calc(100%+8px)] top-0 z-[85] w-[296px] space-y-4 border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-soft-card)]"
                  ref={workspaceSettingsPopoverRef}
                >
                  <form
                    className="space-y-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setWorkspaceError(null);
                      setWorkspaceNotice(null);
                      setIsWorking(true);

                      const result = await renameCurrentWorkspace(
                        renameWorkspaceName,
                      );
                      setIsWorking(false);

                      if (!result.ok) {
                        setWorkspaceError(result.error);
                        return;
                      }

                      setWorkspaceNotice("Workspace renamed");
                      setShowWorkspaceSettings(false);
                    }}
                  >
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                      htmlFor="rename-workspace"
                    >
                      Rename workspace
                    </label>
                    <input
                      className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                      id="rename-workspace"
                      onChange={(event) => {
                        setRenameWorkspaceName(event.target.value);
                      }}
                      value={renameWorkspaceName}
                    />
                    <div className="flex justify-end">
                      <button
                        className="rounded-[4px] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95"
                        disabled={isWorking}
                        type="submit"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  <form
                    className="space-y-2 border-t border-[var(--color-border)] pt-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setWorkspaceError(null);
                      setWorkspaceNotice(null);
                      setIsWorking(true);

                      const result = await deleteCurrentWorkspace(
                        deleteConfirmName,
                      );
                      setIsWorking(false);

                      if (!result.ok) {
                        setWorkspaceError(result.error);
                        return;
                      }

                      closeWorkspacePopovers();
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                      Delete workspace
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      Type{" "}
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {currentWorkspace.name}
                      </span>{" "}
                      to permanently delete this workspace and all its contents.
                    </p>
                    <input
                      className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                      onChange={(event) => {
                        setDeleteConfirmName(event.target.value);
                      }}
                      placeholder={currentWorkspace.name}
                      value={deleteConfirmName}
                    />
                    <div className="flex justify-end">
                      <button
                        className="rounded-[4px] bg-[#dd5b00] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                        disabled={isWorking}
                        type="submit"
                      >
                        Delete workspace permanently
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
            <div className="grid min-h-0 flex-1 gap-3">
              <SidebarSection
                items={buckets.recents}
                onOpenItem={handleOpenDocument}
                title="Recents"
              />
              <SidebarSection
                items={buckets.shared}
                onOpenItem={handleOpenDocument}
                title="Shared"
              />
              {canManageCurrentWorkspace ? (
                <SidebarSection
                  items={buckets.privateDocs}
                  onOpenItem={handleOpenDocument}
                  title="Private"
                />
              ) : null}
            </div>
          </nav>

          {canManageCurrentWorkspace ? (
            <button
              className="mt-3 flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3.5 py-3 text-left text-sm font-medium shadow-[var(--shadow-whisper)] transition hover:bg-[var(--color-card)]"
              onClick={() => {
                router.push("/trash");
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="size-4 text-[var(--color-muted-foreground)]" />
                Trash
              </div>
            </button>
          ) : null}
        </aside>

        <main className="relative z-0 h-screen min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#fdfcfb_100%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
