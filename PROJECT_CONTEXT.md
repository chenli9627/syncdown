# Syncdown Project Context

This file stores high-signal project requirements and current status so work can resume safely even if chat context is lost.

## Product

- Product name: `Syncdown`
- v2 is a rebuild, not a continuation of legacy-v1
- Reference feel can be Notion-like, but feature scope must follow confirmed requirements only

## Confirmed Core Scope

- Auth: login, register, settings
- Workspace shell and workspace switching
- Document sharing and guest access
- Trash
- Rich text editing
- Slash menu and block menu
- Drag interactions
- Image upload
- Markdown `.md` and `.zip` import/export
- AI selection bubble
- Collaboration

## Collaboration Rules

- Collaboration stack is `Yjs + Tiptap Collaboration + Hocuspocus`
- Do not revert to custom `/api/presence` polling
- Remote text carets are intentionally hidden
- Active collaborator avatars show beside the block being edited
- On same-block hover, collaborator avatars sit inline with `+` and the six-dot handle
- Top-bar collaborator display has been removed and should not be restored
- Selection bubble positioning has already been fixed and should not be re-broken by collaborator avatars

## Sidebar Rules

- The top sidebar card shows the current user avatar on the left
- If no avatar exists, fall back to the user's first initial
- `Recents / Shared / Private` section headers do not show a collapse arrow
- `Recents / Shared / Private` section headers do not show a `...` button
- Section headers keep the numeric show-count selector
- `Private` keeps its `+` action
- In Chinese locale, sidebar labels should be localized (`主页 / 最近 / 共享 / 私有 / 废纸篓`)

## Login / Entry UI Rules

- The login page remains the first-entry route
- The login page brand wordmark is intentionally large and serif-styled
- The serif stack should prefer `Noto Serif`
- The entry-link copy currently uses `New User? ...` / `Existing User? ...`

## Explicit Do / Do Not

- Do not restore `legacy-v1`
- Do not upload to GitHub
- Do not rewrite the collaboration layer
- `Toggle list` is intentionally not in scope
- Table-cell blue active border is intentionally not in scope
- If special Markdown is unsupported, reject import directly instead of partial compatibility

## Persistence

- The architecture supports fallback local snapshot persistence at `.data/app-state.json`
- The current verified runtime environment uses:
  - PostgreSQL for app-state persistence
  - S3-compatible object storage for media
- Do not assume `.data/app-state.json` is the active persistence backend without checking env/runtime
- Even when S3-compatible storage is enabled, app-facing managed media URLs should remain on `/api/media/...`
- Do not switch public Syncdown state to direct bucket URLs for avatars or editor images
- Public state now normalizes previously stored managed bucket URLs back to `/api/media/...`

## Verified Runtime Facts

- `.env.local` currently contains a live `DATABASE_URL`
- `.env.local` currently contains S3-compatible storage settings
- User records and document records have been verified in PostgreSQL
- Uploaded avatar files have been verified in the object storage bucket
- Passwords are now stored as `scrypt` hashes instead of plaintext
- Existing plaintext passwords in the live PostgreSQL snapshot have already been migrated to hashes
- The dev server has been run locally on `127.0.0.1:3000`
- The collaboration websocket server has been run locally on `127.0.0.1:1234`
- Current upload responses now return `/api/media/...` instead of direct `STORAGE_PUBLIC_BASE_URL` links

## Important Files

- `src/app/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/features/shell/components/shell-sidebar.tsx`
- `src/features/shell/components/sidebar-section.tsx`
- `src/features/shell/components/shell-sidebar-sections.tsx`
- `src/features/auth/components/login-form.tsx`
- `src/features/editor/components/editor-canvas.tsx`
- `src/features/editor/components/editor-block-controls.tsx`
- `src/features/editor/components/editor-collaborator-avatar-stack.tsx`
- `src/features/editor/hooks/use-editor-collaboration.ts`
- `src/features/editor/hooks/use-editor-selection-ai.ts`
- `src/features/app-state/hooks/use-app-state-sync.ts`
- `src/features/app-state/lib/mutations/auth.ts`
- `src/features/app-state/lib/password.ts`
- `src/lib/server/media-references.ts`
- `src/lib/server/media-storage/config.ts`
- `src/lib/server/state-store.ts`
- `scripts/reset-password.mjs`

## Recent Verified Commands

- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Known Noise / Non-Product Errors

- If the console shows a hydration warning mentioning `body className=\"vsc-initialized\"`, treat it as browser-extension DOM mutation noise rather than a Syncdown product bug
- Root layout keeps `suppressHydrationWarning` on both `html` and `body` to reduce this noise

## Current Password Reset CLI

- Preferred:
  - `pnpm reset-password --email <email> --password <new-password>`
- Backward-compatible:
  - `pnpm reset-password --username <username> --password <new-password>`
