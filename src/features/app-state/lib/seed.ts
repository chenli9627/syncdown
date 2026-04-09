import type {
  DocumentAccess,
  DocumentRecord,
  RecentVisit,
  StoredSyntextState,
  StoredUser,
  Workspace,
} from "@/features/app-state/types";

const now = new Date().toISOString();
const ownerSeedPassword =
  "scrypt$2744e2699ab6015260cd55c88161699d$23ae1e8fe2e3e948291c7b5c5dafdf4160d83147e391fcee73797e099e106a9bf74268f1f08f13bd7a898a1a0d82df7a74612c0690cba47751e6fba0d60d6da7";
const guestSeedPassword =
  "scrypt$52518609d2bddcf83d642b9c4933a26d$82cc033245a88de8b1821ffae617b809a0479b4b9cb235cdc9594bbf9e1cf814f40cb87be31bdd397a33e8490b17aecf2073eb5408c794e64688acf304b82b72";

const ownerUser: StoredUser = {
  id: "user_owner",
  email: "one@syncdown.dev",
  username: "one",
  name: "One",
  password: ownerSeedPassword,
  avatarUrl: null,
  createdAt: now,
};

const guestUser: StoredUser = {
  id: "user_guest",
  email: "two@syncdown.dev",
  username: "two",
  name: "Two",
  password: guestSeedPassword,
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
