# Syncdown

Syncdown is a collaborative document app built with Next.js, Tiptap, Yjs, and Hocuspocus.

This repository is the active `syncdown v2` implementation inside the `/home/chen/code/bs` workspace. The product direction is a restrained, Notion-like collaborative editor, but scope is limited to the features already confirmed in the codebase and project docs.

## Current Scope

- authentication: login, register, settings
- workspace shell and workspace switching
- owner / guest workspace-relative roles
- private documents, shared documents, trash
- rich text editing with slash menu and block menu
- image upload for editor content and user avatars
- markdown `.md` and `.zip` import/export
- AI selection bubble
- AI chat panel
- real-time collaboration with awareness-based presence
- owner / guest access model with `can_edit` and `can_view`
- paginated updates, version history, and trash views

## Current AI Behavior

Syncdown currently exposes two separate AI surfaces:

- `AI selection bubble`
  - works on selected editor text
  - supports translate, summarize, explain, polish, and custom prompts
  - can replace the current selection or insert the result below
- `AI chat panel`
  - discussion-only
  - can answer questions about the current document, summarize, explain, translate, and handle supported query tools such as weather lookups
  - does not directly edit the document

Only one AI request is allowed at a time across both entry points.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Tiptap
- Yjs
- Hocuspocus
- AI SDK
- PostgreSQL or local JSON snapshot persistence
- local media storage or S3-compatible object storage

## Local Development

Fastest known-good local startup in this workspace:

```bash
pnpm install
pnpm dev:reset-state
pnpm dev:sync-media
pnpm dev
```

This resets the PostgreSQL app state from `.data/app-state.json`, uploads local media from `.data/media` into the configured S3 / MinIO bucket, and then starts:

- the web app on `http://127.0.0.1:3000`
- the collaboration websocket server on `ws://127.0.0.1:1234`

If you only need the app process and your local state is already healthy, the shorter path is:

```bash
pnpm install
pnpm dev
```

Other useful commands:

```bash
pnpm dev:reset-state
pnpm dev:sync-media
pnpm lint
pnpm test
pnpm build
pnpm reset-password --email <email> --password <new-password>
```

Backward-compatible password reset:

```bash
pnpm reset-password --username <username> --password <new-password>
```

## Current Workspace Setup

In this workspace, the current known-good local env is:

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

Notes:

- these values reflect the current working host services in `/home/chen/code/bs`, not necessarily the defaults in `docker-compose.yml`
- if your running PostgreSQL or MinIO containers were created earlier with different credentials, trust the actual running container config over old docs
- after changing `.env.local`, restart `pnpm dev`

## Docker Services

The repository includes a `docker-compose.yml` for infrastructure only:

- PostgreSQL for persistent app state
- MinIO for S3-compatible media storage

The Syncdown application itself should be started locally with `pnpm`, not with Docker.

### 1. Start PostgreSQL and MinIO

Run:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `127.0.0.1:5432`
- MinIO API on `http://127.0.0.1:9000`
- MinIO console on `http://127.0.0.1:9001`

The `minio-init` job automatically creates the `syncdown` bucket on first startup.

Check status:

```bash
docker compose ps
```

Watch service logs:

```bash
docker compose logs -f postgres minio
```

### 2. Configure the app environment

Create a local env file if you do not already have one:

```bash
cp .env.example .env.local
```

If you are using the services created by this repository's `docker-compose.yml`, set `.env.local` like this:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/syncdown

NEXT_PUBLIC_COLLAB_URL=ws://127.0.0.1:1234
NEXT_PUBLIC_COLLAB_PORT=1234
COLLAB_HOST=0.0.0.0
COLLAB_PORT=1234

STORAGE_BACKEND=s3
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_REGION=us-east-1
STORAGE_BUCKET=syncdown
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
STORAGE_PUBLIC_BASE_URL=http://127.0.0.1:9000/syncdown

AI_API_KEY=
ARK_API_KEY=
AI_BASE_URL=
AI_MODEL=
AI_SECONDARY_MODEL=
```

Notes:

- `DATABASE_URL` uses `127.0.0.1` because the app runs on the host, not inside Compose networking.
- `STORAGE_ENDPOINT` also uses `127.0.0.1` for the same reason.
- using `STORAGE_PUBLIC_BASE_URL=http://127.0.0.1:9000/syncdown` is fine because user-facing state is still normalized back to `/api/media/...`
- If AI is not configured yet, leave the AI variables empty.
- `AI_MODEL` is the primary answer model and `AI_SECONDARY_MODEL` is the comparison model.
- if you use already-running host services instead of this compose file, use the credentials that those services were actually started with

### 3. Start the Syncdown app with pnpm

Install dependencies:

```bash
pnpm install
```

For development:

```bash
pnpm dev:reset-state
pnpm dev:sync-media
pnpm dev
```

For a production-style local run:

```bash
pnpm build
pnpm start
```

This starts:

- the web app on `http://127.0.0.1:3000`
- the collaboration websocket server on `ws://127.0.0.1:1234`

On a healthy startup you should be able to:

- open `http://127.0.0.1:3000`
- see the login/register UI
- create documents backed by PostgreSQL
- upload images that are stored in MinIO but still served through `/api/media/...`

Why the extra recovery commands matter:

- `pnpm dev:reset-state` makes PostgreSQL match `.data/app-state.json`
- `pnpm dev:sync-media` makes the bucket contain the files from `.data/media`
- if PostgreSQL points at old documents while the bucket is empty or unrelated, you can get `500` responses from `/api/media/...` even though `pnpm dev` itself starts cleanly

### 4. First login and password reset

Syncdown does not create a default admin account automatically.

Register a user from the UI, or reset an existing user password locally:

```bash
pnpm reset-password --email you@example.com --password new-password
```

The username-based reset remains available:

```bash
pnpm reset-password --username yourname --password new-password
```

### 5. Stop or clean the Docker services

Stop the infrastructure services without deleting data:

```bash
docker compose down
```

Restart them:

```bash
docker compose up -d
```

Stop and delete volumes:

```bash
docker compose down -v
```

Be careful with `-v`: it deletes PostgreSQL data and MinIO objects.

If you deleted volumes or recreated infrastructure, run these again before `pnpm dev`:

```bash
pnpm dev:reset-state
pnpm dev:sync-media
```

### 6. Remote deployment note

If you later deploy Syncdown to another server but still want to keep the same split:

- run `postgres` and `minio` with Docker
- run the app process with `pnpm build && pnpm start`
- point `DATABASE_URL` and `STORAGE_ENDPOINT` to the actual reachable hostnames
- make sure websocket traffic for port `1234` is reachable or proxied correctly

## Persistence

App state supports two backends:

- no `DATABASE_URL`
  - state is stored in `.data/app-state.json`
- `DATABASE_URL` configured
  - state is stored in PostgreSQL table `syncdown_state`

Media storage supports two backends:

- `STORAGE_BACKEND=local`
  - files are written to `.data/media`
- `STORAGE_BACKEND=s3`
  - files are stored through an S3-compatible adapter

Important rule:

- app-facing image and avatar URLs should remain on `/api/media/...`
- do not switch user-facing state to direct bucket URLs

## Environment

### Database

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/syncdown
```

### Collaboration

```bash
NEXT_PUBLIC_COLLAB_URL=
NEXT_PUBLIC_COLLAB_PORT=1234
COLLAB_HOST=0.0.0.0
COLLAB_PORT=1234
```

### Media Storage

Example local S3-compatible setup:

```bash
STORAGE_BACKEND=s3
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_REGION=auto
STORAGE_BUCKET=syncdown
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
```

### AI

```bash
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
AI_SECONDARY_API_KEY=
AI_SECONDARY_BASE_URL=
AI_SECONDARY_MODEL=
```

The chat panel uses `/api/ai/chat/[documentId]`. The selection AI uses the editor-specific AI endpoints.

## Collaboration Behavior

- document bodies sync through Yjs
- active collaborator presence uses awareness
- remote text caret markers are intentionally hidden
- collaborator avatars appear beside the block being edited
- local dev uses the bundled Hocuspocus server

## Editor and Media Notes

- new documents are auto-named as `Untitled`, `Untitled1`, `Untitled2`, etc.
- new documents enter title editing immediately with the default title selected
- new image uploads return `/api/media/...`
- markdown export supports images and bundles them into zip assets when needed
- drag-and-drop image upload is supported
- copying image to clipboard has been removed from the image block menu
- editor supports headings `h1` through `h6`, paragraphs, lists, task lists, tables, code blocks, links, strikethrough, and footnotes
- markdown link parsing supports handwritten links with Chinese domains or Chinese paths

## Internationalization and UI Notes

- Chinese locale localizes the sidebar labels
- login page uses a large serif brand treatment
- login / register switch links use `New User? ...` and `Existing User? ...`
- default user avatars fall back to blue background with white initial

## Testing

Automated checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Current automated coverage includes:

- auth validation and password hashing
- untitled naming rules
- sharing and access control
- trash / restore behavior
- markdown import/export guards
- markdown paste parsing
- media URL normalization and export bundling
- workspace visibility rules
- AI route validation and AI chat persistence
- collaboration provider sync

## Important Docs

- `my_plan.md`
- `PROJECT_CONTEXT.md`
- `ARCHITECTURE_V2.md`
- `DESIGN.md`
- `status.md`

## Known Non-Product Noise

- hydration warnings mentioning `body className="vsc-initialized"` are usually caused by browser extensions mutating the DOM before hydration
- the root layout keeps `suppressHydrationWarning` on `html` and `body` to reduce this noise

## Troubleshooting

### `pnpm dev` starts, but images return `500`

Check these in order:

1. confirm MinIO is reachable on `127.0.0.1:9000`
2. confirm `.env.local` credentials match the actual running MinIO container
3. run:

```bash
pnpm dev:reset-state
pnpm dev:sync-media
```

4. restart `pnpm dev`

Typical cause:

- PostgreSQL contains old `/api/media/...` references, but the MinIO bucket is empty or contains a different dataset

### `pnpm dev` starts, but the app shows unexpected documents or users

Typical cause:

- `DATABASE_URL` is set, so the app is reading PostgreSQL instead of `.data/app-state.json`

Fix:

```bash
pnpm dev:reset-state
```

### I changed `.env.local`, but behavior did not change

Fix:

- stop `pnpm dev`
- start it again so Next.js reloads `.env.local`
