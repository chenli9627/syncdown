import type {
  DocumentAccess,
  DocumentRecord,
  RecentVisit,
  StoredSyntextState,
  StoredUser,
  Workspace,
} from "@/features/app-state/types";

const now = new Date().toISOString();

const ownerUser: StoredUser = {
  id: "user_owner",
  email: "one@syncdown.dev",
  username: "one",
  name: "One",
  password: "onepass123",
  avatarUrl: null,
  createdAt: now,
};

const guestUser: StoredUser = {
  id: "user_guest",
  email: "two@syncdown.dev",
  username: "two",
  name: "Two",
  password: "twopass123",
  avatarUrl: null,
  createdAt: now,
};

const defaultWorkspace: Workspace = {
  id: "workspace_default",
  ownerUserId: ownerUser.id,
  name: "Default",
  lastAccessedAt: now,
  createdAt: now,
};

const sharedWorkspace: Workspace = {
  id: "workspace_notes",
  ownerUserId: ownerUser.id,
  name: "Client Notes",
  lastAccessedAt: now,
  createdAt: now,
};

const guestOwnedWorkspace: Workspace = {
  id: "workspace_guest_lab",
  ownerUserId: guestUser.id,
  name: "Research Lab",
  lastAccessedAt: now,
  createdAt: now,
};

const documents: DocumentRecord[] = [
  {
    id: "doc_pitch",
    workspaceId: defaultWorkspace.id,
    ownerUserId: ownerUser.id,
    title: "Draft pitch",
    content: "",
    status: "private",
    lastEditedAt: now,
    createdAt: now,
  },
  {
    id: "doc_review",
    workspaceId: defaultWorkspace.id,
    ownerUserId: ownerUser.id,
    title: "Weekly review",
    content: "",
    status: "private",
    lastEditedAt: now,
    createdAt: now,
  },
  {
    id: "doc_shared_brief",
    workspaceId: sharedWorkspace.id,
    ownerUserId: ownerUser.id,
    title: "Team brief",
    content: "",
    status: "shared",
    lastEditedAt: now,
    createdAt: now,
  },
  {
    id: "doc_guest_playbook",
    workspaceId: guestOwnedWorkspace.id,
    ownerUserId: guestUser.id,
    title: "Interview notes",
    content: "",
    status: "shared",
    lastEditedAt: now,
    createdAt: now,
  },
];

const accesses: DocumentAccess[] = [
  {
    documentId: "doc_shared_brief",
    userId: guestUser.id,
    permission: "can_edit",
  },
  {
    documentId: "doc_guest_playbook",
    userId: ownerUser.id,
    permission: "can_edit",
  },
];

const recentVisits: RecentVisit[] = [
  {
    userId: ownerUser.id,
    documentId: "doc_pitch",
    visitedAt: now,
  },
  {
    userId: ownerUser.id,
    documentId: "doc_shared_brief",
    visitedAt: now,
  },
  {
    userId: guestUser.id,
    documentId: "doc_shared_brief",
    visitedAt: now,
  },
  {
    userId: guestUser.id,
    documentId: "doc_guest_playbook",
    visitedAt: now,
  },
  {
    userId: ownerUser.id,
    documentId: "doc_guest_playbook",
    visitedAt: now,
  },
];

export function createSeedState(): StoredSyntextState {
  return {
    users: [ownerUser, guestUser],
    workspaces: [defaultWorkspace, sharedWorkspace, guestOwnedWorkspace],
    documents,
    accesses,
    recentVisits,
  };
}
