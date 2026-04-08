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
- MinIO locally, S3-compatible object storage in production
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
