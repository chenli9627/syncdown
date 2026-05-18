codex resume 019dacc9-d274-7a10-a60b-136aaf0ebf73
opencode -s ses_22f656cfbffem1Y3MJBY2U4mai

019de9cb-d213-7ed2-80a9-1865a6bc3ecc

论文 019e05cf-c1f9-7541-b7a4-faceb9f57de5

Syncdown Progress
Date: 2026-05-18

- Branch reset to `cebc6f8` (`Focus title after creating a document`) to remove all later comment-feature work.
- `AGENTS.md` updated to record:
  - always use `pnpm` and `pnpx`
  - do not use `npm` or `npx`
  - do not use `agent-browser`; use Chrome DevTools tooling for browser verification instead
  - successful modifications must be recorded with git
- Current in-progress task: when creating a new document, the title should immediately enter full-selection edit state.
- Current local files related to that task:
  - `src/features/editor/components/document-editor-shell.tsx`
  - `src/features/editor/components/editor-header-title.tsx`
- Current finding: new-document navigation reaches `/documents/... ?focus=title` and the title input gains focus, but the selection still collapses to the end instead of staying fully selected.
