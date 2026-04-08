# Syncdown

`Syncdown` is the new product line for this workspace.

This directory is reserved for the v2 rebuild described in [my_plan.md](../my_plan.md).

Current workspace structure:

- `legacy-v1/`
  - archived first implementation and all of its supporting files
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

## Media Storage

The current build stores uploaded editor images through the app-owned `/api/media`
interface. The default development backend writes to `.data/media/`.

Environment direction:

- `STORAGE_BACKEND=local` for local development
- `STORAGE_BACKEND=s3` enables the S3-compatible adapter for MinIO or R2
- `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`,
  `STORAGE_SECRET_ACCESS_KEY`, and `STORAGE_FORCE_PATH_STYLE` configure the S3-compatible backend
- editor-facing image URLs remain on `/api/media/...`, so switching storage backends does not affect editor or markdown export logic
