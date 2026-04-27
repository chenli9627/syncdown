export type Permission = "can_edit" | "can_view";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type StoredUser = User & {
  password: string;
};

export type Workspace = {
  id: string;
  ownerUserId: string;
  name: string;
  lastAccessedAt: string;
  createdAt: string;
};

export type DocumentVersion = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  userId: string;
};

export type DocumentRecord = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  title: string;
  content: string;
  status: "private" | "shared" | "trashed";
  trashedFromStatus?: "private" | "shared" | null;
  deletedAt?: string | null;
  lastEditedAt: string;
  createdAt: string;
  versionHistory?: DocumentVersion[];
};

export type DocumentAccess = {
  documentId: string;
  userId: string;
  permission: Permission;
};

export type RecentVisit = {
  userId: string;
  documentId: string;
  visitedAt: string;
};

export type Session = {
  userId: string;
  currentWorkspaceId: string;
};

export type SyntextState = {
  users: User[];
  workspaces: Workspace[];
  documents: DocumentRecord[];
  accesses: DocumentAccess[];
  recentVisits: RecentVisit[];
};

export type StoredSyntextState = {
  users: StoredUser[];
  workspaces: Workspace[];
  documents: DocumentRecord[];
  accesses: DocumentAccess[];
  recentVisits: RecentVisit[];
};
