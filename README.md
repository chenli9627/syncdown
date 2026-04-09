# Syncdown

`Syncdown` is the new product line for this workspace.

This directory is reserved for the v2 rebuild described in [my_plan.md](../my_plan.md).

Current workspace structure:

- `syncdown/`
  - new implementation workspace for the rebuilt product
- `my_plan.md`
  - current product definition for the rebuild

Immediate focus for v2:

- auth-first entry flow
- workspace, shared/private/guest information architecture
- rebuilt editor interaction model
- future-ready collaboration and AI integration points

## Current Stack Direction

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui-compatible foundation
- PostgreSQL
- local file-backed media storage adapter in development
- MinIO / R2 through an S3-compatible adapter in production
- Tiptap editor

## Phase Workflow

Execution phases are tracked in [docs/IMPLEMENTATION_PHASES.md](./docs/IMPLEMENTATION_PHASES.md).

## Development

Planned local commands:

```bash
pnpm install
pnpm dev
```

The dev server will be exposed on `0.0.0.0:3000` for LAN access during review.

## Settings

The current build includes a real `/settings` page:

- `Profile`
  - update display name
  - upload avatar
  - change password
  - view immutable username
  - view email
- `Preferences`
  - switch language
  - switch theme (`System / Light / Dark`)

The settings entry is available from the top workspace popover.

## State Persistence

The app now supports two state backends:

- no `DATABASE_URL`
  - state persists to `.data/app-state.json`
- `DATABASE_URL` configured
  - state persists to PostgreSQL through a JSONB snapshot table named `syncdown_state`

This keeps the current API surface stable while allowing the project to move off local JSON storage.

On the first PostgreSQL read, if the table is empty and `.data/app-state.json` already exists,
Syncdown will bootstrap the database snapshot from that local file before falling back to seed data.

Example PostgreSQL environment:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/syncdown
```

The password reset command follows the same storage backend:

```bash
pnpm reset-password --username one --password newpassword123
```

## AI

AI requests are sent from the frontend to `/api/ai/action`.

The server reads these environment variables:

```bash
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

For Volcengine's OpenAI-compatible endpoint, the current local setup uses:

```bash
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_MODEL=deepseek-v3-2-251201
```

The route automatically resolves the OpenAI-compatible `responses` endpoint from the configured base URL.

## Collaboration

The current build now follows the official Tiptap + Yjs direction for collaboration:

- `Y.Doc`
- `@tiptap/extension-collaboration`
- `@hocuspocus/provider`
- `@hocuspocus/server`
- awareness-based collaborator presence

Local development uses a bundled websocket server:

```bash
pnpm dev
```

This starts:

- the Next.js app on `0.0.0.0:3000`
- the collaboration websocket server on `0.0.0.0:1234`

Environment direction:

```bash
NEXT_PUBLIC_COLLAB_URL=
NEXT_PUBLIC_COLLAB_PORT=1234
COLLAB_HOST=0.0.0.0
COLLAB_PORT=1234
```

Current collaboration behavior:

- document bodies sync through Yjs
- active collaborator state uses awareness instead of app-owned TTL polling
- remote text caret markers are not rendered
- collaborators are shown as avatars beside the block they are actively editing
- when block controls are visible, collaborator avatars align in the same control lane as `+` and the six-dots button
- if multiple collaborators are inside the same block, show up to two avatars and collapse overflow into `+N`
- local development uses a bundled Hocuspocus websocket server

This replaces the old REST presence endpoint path.

## Testing

The current repository includes automated regression coverage for:

- AI route validation, missing-config failures, and remote request routing
- markdown import guard rules
- media storage configuration and URL generation
- auth validation and naming rules
- document sharing, trash, and restore behavior
- workspace/document visibility rules

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

## Media Storage

The current build stores uploaded editor images through the app-owned `/api/media`
interface. The default development backend writes to `.data/media/`.

Environment direction:

- `STORAGE_BACKEND=local` for local development
- `STORAGE_BACKEND=s3` enables the S3-compatible adapter for MinIO or R2
- `STORAGE_PUBLIC_BASE_URL` can point the editor at a public media origin instead of routing reads through `/api/media`
- `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`,
  `STORAGE_SECRET_ACCESS_KEY`, and `STORAGE_FORCE_PATH_STYLE` configure the S3-compatible backend
- editor-facing image URLs remain on `/api/media/...`, so switching storage backends does not affect editor or markdown export logic

Example local MinIO environment:

```bash
STORAGE_BACKEND=s3
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_REGION=auto
STORAGE_BUCKET=syncdown
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
```
