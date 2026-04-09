# Syncdown

Syncdown is a collaborative document app built with Next.js, Tiptap, Yjs, and Hocuspocus.

This repository is the active `syncdown v2` implementation inside the `/home/chen/code/bs` workspace. The product direction is a restrained, Notion-like collaborative editor, but scope is limited to the features already confirmed in the codebase and project docs.

## Current Scope

- authentication: login, register, settings
- workspace shell and workspace switching
- private documents, shared documents, trash
- rich text editing with slash menu and block menu
- image upload for editor content and user avatars
- markdown `.md` and `.zip` import/export
- AI editor actions
- real-time collaboration with awareness-based presence
- owner / guest access model with `can_edit` and `can_view`

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Tiptap
- Yjs
- Hocuspocus
- PostgreSQL or local JSON snapshot persistence
- local media storage or S3-compatible object storage

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

This starts:

- the web app on `http://127.0.0.1:3000`
- the collaboration websocket server on `ws://127.0.0.1:1234`

Other useful commands:

```bash
pnpm lint
pnpm test
pnpm build
pnpm reset-password --email <email> --password <new-password>
```

Backward-compatible password reset:

```bash
pnpm reset-password --username <username> --password <new-password>
```

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
```

The frontend sends AI requests to `/api/ai/action`.

## Collaboration Behavior

- document bodies sync through Yjs
- active collaborator presence uses awareness
- remote text caret markers are intentionally hidden
- collaborator avatars appear beside the block being edited
- local dev uses the bundled Hocuspocus server

## Editor and Media Notes

- new documents are auto-named as `Untitled`, `Untitled1`, `Untitled2`, etc.
- new image uploads return `/api/media/...`
- markdown export supports images and bundles them into zip assets when needed
- drag-and-drop image upload is supported
- copying image to clipboard has been removed from the image block menu

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
- media URL normalization and export bundling
- workspace visibility rules
- AI route validation
- collaboration provider sync

## Important Docs

- `../my_plan.md`
- `PROJECT_CONTEXT.md`
- `ARCHITECTURE_V2.md`
- `../DESIGN.md`

## Known Non-Product Noise

- hydration warnings mentioning `body className="vsc-initialized"` are usually caused by browser extensions mutating the DOM before hydration
- the root layout keeps `suppressHydrationWarning` on `html` and `body` to reduce this noise
