# Workspace Guide (AGENTS.md)

This file is the fast-start context for future Codex sessions in `/home/chen/code/bs/syncdown`.

## 1. Workspace Overview

This directory is the primary Syncdown Git repository root.

Main directories:

Unless the user says otherwise, assume work should happen in this repository root, not inside the nested projects.

## 2. Primary Project: Syncdown

Product name:

- `Syncdown`
- no Chinese product name

Product posture:

- `Syncdown v2` is a rebuild, not a continuation of `legacy-v1`
- Notion can be used as a visual and interaction reference only
- do not invent scope beyond what is confirmed in `my_plan.md`

Canonical planning documents:

- `/home/chen/code/bs/syncdown/my_plan.md`
- `/home/chen/code/bs/syncdown/DESIGN.md`
- `/home/chen/code/bs/syncdown/status.md`
- `/home/chen/code/bs/syncdown/docs/current-system-capabilities.md`

## 3. Confirmed Product Scope

The current confirmed Syncdown scope includes:

- auth: login, register, settings
- workspace shell and workspace switching
- owner / guest workspace-relative roles
- document sharing and guest access
- trash
- rich text editing
- slash menu and block menu
- drag interactions
- image upload
- Markdown `.md` and `.zip` import / export
- AI selection bubble
- collaboration

Core product model:

- `owner` and `guest` are workspace-relative identities
- only owners create documents and manage sharing
- guests only see explicitly shared documents in that workspace
- document guest permissions are `can_edit` and `can_view`
- `Trash` is owner-only and workspace-scoped

## 4. Tech Stack

Syncdown stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Tiptap
- Yjs
- Hocuspocus
- PostgreSQL
- S3-compatible object storage

Current local runtime commonly uses:

- app: `http://127.0.0.1:3000`
- collaboration websocket: `ws://127.0.0.1:1234`
- MinIO / S3-compatible storage endpoint: `http://127.0.0.1:9000`

## 5. Persistence Rules

App-state persistence:

- if `DATABASE_URL` is unset, state falls back to `.data/app-state.json`
- if `DATABASE_URL` is set, state persists to PostgreSQL table `syncdown_state`

Media storage:

- storage backend is selected via `STORAGE_BACKEND`
- `local` writes to `.data/media`
- `s3` uses the configured S3-compatible adapter
- editor-facing and avatar-facing URLs should stay on `/api/media/...`
- do not switch the public app state to direct bucket URLs for user-facing media

Important:

- current code normalizes managed media back to `/api/media/...` even if old state contains public bucket URLs

## 6. Collaboration Rules

Collaboration stack is fixed:

- `Yjs + Tiptap Collaboration + Hocuspocus`

Do not do these:

- do not restore custom `/api/presence` polling
- do not rewrite the collaboration layer casually
- do not reintroduce top-bar collaborator presence

Current collaboration behavior:

- document content syncs through Yjs
- awareness drives active collaborator presence
- remote text caret markers are intentionally hidden
- collaborator avatars appear beside the block being edited

## 7. UI / Design Rules

Reference design file:

- `/home/chen/code/bs/syncdown/DESIGN.md`

Current visual rules:

- warm neutral palette
- restrained Notion-like feel
- keep Syncdown’s design language consistent across shell, editor, popovers, and settings
- keep square-corner language for normal cards, popovers, and buttons unless there is an explicit exception

Important current UI expectations:

- Chinese locale should show Chinese sidebar labels
- login page brand wordmark is large and serif-styled
- `Settings` exists as a real route

## 8. Engineering Rules

General engineering expectations:

- prefer simple, production-friendly implementations
- avoid overengineering
- keep APIs explicit and naming clear
- always use `pnpm` and `pnpx`
- do not use `npm` or `npx`
- do not use `agent-browser`; use Chrome DevTools tooling for browser verification instead
- successful modifications must be recorded with git
- run lint after changes
- when `pnpm dev` is already running, rely on its hot reload for development checks
- do not run `pnpm build` after every small change; reserve it for larger features, API/route/dependency changes, or pre-commit final verification

Code structure constraints:

- no file should exceed 300 lines if it can be reasonably split
- prefer extending via new files rather than bloating existing ones

## 9. Important Commands

Inside this repository:

```bash
pnpm install
pnpm dev:reset-state
pnpm dev:sync-media
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm reset-password --email <email> --password <new-password>
```

Notes:

- `pnpm dev` starts both the Next.js app and the collaboration server
- `pnpm dev:reset-state` overwrites PostgreSQL row `syncdown_state.id = "default"` with `syncdown/.data/app-state.json`
- `pnpm dev:sync-media` uploads every file from `syncdown/.data/media` into the configured S3 / MinIO bucket
- `pnpm reset-password --username <username> --password <new-password>` remains supported

## 10. Local Startup Recipe

Fastest known-good startup path in this workspace:

1. `cd /home/chen/code/bs/syncdown`
2. make sure host services are reachable:
   - PostgreSQL: `127.0.0.1:5432`
   - MinIO API: `127.0.0.1:9000`
3. check `.env.local`
4. run:

```bash
pnpm install
pnpm dev:reset-state
pnpm dev:sync-media
pnpm dev
```

Expected endpoints:

- app: `http://127.0.0.1:3000`
- collab websocket: `ws://127.0.0.1:1234`
- MinIO console: `http://127.0.0.1:9001`

Current known-good local env in this workspace:

```bash
DATABASE_URL=postgresql://syncdown:syncdown_password@127.0.0.1:5432/syncdown

STORAGE_BACKEND=s3
STORAGE_BUCKET=syncdown
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_FORCE_PATH_STYLE=true
STORAGE_PUBLIC_BASE_URL=http://127.0.0.1:9000/syncdown
```

Important:

- `syncdown/docker-compose.yml` is not the source of truth for the currently running host services in this workspace
- if local containers were created earlier with different credentials, prefer checking the actual running container config over assuming the compose defaults
- if the app starts but old pages show missing images, the usual fix is to reset state and re-sync media, not to debug Next.js first

## 11. Important Files

High-signal files for Syncdown:

- `/home/chen/code/bs/syncdown/my_plan.md`
- `/home/chen/code/bs/syncdown/status.md`
- `/home/chen/code/bs/syncdown/docs/current-system-capabilities.md`
- `/home/chen/code/bs/syncdown/src/lib/server/state-store.ts`
- `/home/chen/code/bs/syncdown/src/lib/server/media-references.ts`
- `/home/chen/code/bs/syncdown/src/lib/server/media-storage/config.ts`
- `/home/chen/code/bs/syncdown/src/features/app-state/lib/mutations/auth.ts`
- `/home/chen/code/bs/syncdown/src/features/shell/components/shell-sidebar.tsx`
- `/home/chen/code/bs/syncdown/src/features/shell/components/sidebar-section.tsx`
- `/home/chen/code/bs/syncdown/src/features/editor/components/editor-canvas.tsx`
- `/home/chen/code/bs/syncdown/src/features/settings/components/settings-view.tsx`

## 12. Current Known State

At the time of writing:

- `syncdown` is the project under active development
- the dev server was successfully started locally
- `pnpm test` passes
- `pnpm lint` passes
- image upload logic was adjusted so new uploads return `/api/media/...`
- public state also normalizes old managed media URLs back to `/api/media/...`
- login page copy and sidebar Chinese labels were recently adjusted
- local recovery scripts now exist for dev state and media sync:
  - `pnpm dev:reset-state`
  - `pnpm dev:sync-media`

## 13. Known Pitfalls

Hydration warning:

- if you see a mismatch like `body className="vsc-initialized"`, this is typically a browser extension injecting attributes before React hydrates
- this is not a Syncdown business-logic bug
- the root layout uses `suppressHydrationWarning`; keep that in place unless there is a better verified fix

State assumptions:

- do not assume local JSON is the active source of truth
- check env and runtime first because PostgreSQL may be active
- if `/api/app-state` shows documents you do not expect, inspect PostgreSQL state before assuming `.data/app-state.json` is being used

Media assumptions:

- if `/api/media/...` returns `500`, separate these cases:
  - credential mismatch: MinIO/S3 returns auth or signature errors
  - missing object: the bucket is reachable but the referenced key does not exist
- restarting `pnpm dev` does not fix missing media objects by itself
- after env changes, restart the dev server so Next.js reloads `.env.local`
- for local recovery, usually run:

```bash
pnpm dev:reset-state
pnpm dev:sync-media
```

Scope assumptions:

- do not restore `legacy-v1`
- do not invent unsupported Markdown compatibility
- if a Markdown construct is intentionally unsupported, reject it directly

## 14. Default Working Approach

When starting a new session:

1. confirm whether the task is for `syncdown/`
2. read `my_plan.md`, `status.md`, and `docs/current-system-capabilities.md` if the task touches product behavior
3. inspect current Git status before editing
4. preserve unrelated user changes
5. run `pnpm lint` and relevant tests before finishing
6. run `pnpm build` only when the change is large, touches API/routes/dependencies, or needs final production-build verification
