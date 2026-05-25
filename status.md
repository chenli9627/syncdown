# Syncdown Status

Last updated: 2026-05-25

## Current Product State

Syncdown is currently running as a Notion-like collaborative document app with:

- authentication
- workspace switching
- owner / guest workspace-relative roles
- document sharing
- trash
- rich text editing
- markdown import / export
- image upload
- collaboration
- AI selection bubble
- AI chat panel

`Syncdown v2` is the active product. `legacy-v1` is out of scope.

## Confirmed Working Areas

### Auth and workspace

- login
- register
- settings
- workspace creation / rename / deletion
- owner / guest workspace access model
- guest access limited to explicitly shared documents

### Documents

- create, open, rename, delete, restore
- owner-only trash
- document sharing with `can_edit` and `can_view`
- recent / shared / private sidebar buckets
- paginated updates, version history, and trash views

### Editor

- Tiptap-based rich text editing
- headings `h1` to `h6`
- paragraphs
- bullet lists
- ordered lists
- task lists
- tables
- code blocks
- links
- strikethrough
- images
- slash menu and block menu
- block drag interactions

### Collaboration

- Yjs + Hocuspocus + Tiptap collaboration
- shared document content sync
- awareness-based collaborator presence
- remote caret markers intentionally hidden
- collaborator avatars shown beside the block being edited

## AI Features

### AI chat panel

The AI chat panel is now discussion-only.

It can:

- answer questions about the current document
- summarize document content
- explain document content
- rewrite text in chat responses
- translate in chat responses
- do weather-style queries
- do web fetch style question answering when the backend tool path is available

It does not:

- directly edit the document
- show confirm / cancel document mutation controls
- run the old AI document-edit pipeline

Old AI chat edit threads were cleared from runtime state, and legacy edit payload messages are normalized when loaded.

### AI selection bubble

The selection AI feature is still enabled inside the editor.

Current selection actions:

- 翻译
- 总结
- 解释
- 润色
- custom freeform input

Current selection result actions:

- replace selection
- insert below

Only one AI request is allowed at a time across chat and selection AI entry points.

## Markdown Support

### Supported

- headings
- paragraphs
- blockquotes
- fenced code blocks
- bullet lists
- ordered lists
- task lists
- tables
- links
- strikethrough
- footnotes
- remote images

### Not supported

- raw HTML blocks in markdown import
- local-image markdown import without `.zip`

### Recent link parsing status

Chinese-link parsing was recently improved for markdown handling. The parser now recognizes:

- handwritten markdown links with Chinese domains or paths
- bare domains with Chinese paths
- raw links preceded by Chinese punctuation such as `：`

Related commit:

- `d93df56 Fix Chinese markdown link parsing`

## Persistence and Runtime

Current local runtime is designed to use:

- PostgreSQL for app-state persistence when `DATABASE_URL` is set
- `.data/app-state.json` only as fallback when `DATABASE_URL` is unset
- S3-compatible storage for media when `STORAGE_BACKEND=s3`
- `/api/media/...` as the app-facing media URL surface

Common local endpoints:

- app: `http://127.0.0.1:3000`
- collaboration websocket: `ws://127.0.0.1:1234`
- object storage API: `http://127.0.0.1:9000`

## Recent Important Changes

- `d93df56 Fix Chinese markdown link parsing`
- `41e31bd Normalize legacy AI chat threads`
- `d06c8aa Remove AI chat document edit pipeline`
- `d3a3580 Make AI chat panel discussion-only`

## Current Constraints

- do not use `agent-browser`; use Chrome DevTools for browser verification
- always use `pnpm` and `pnpx`
- successful modifications must be recorded with git
- no file should exceed 300 lines when it can be reasonably split

## Known Local Note

The working tree may contain a local `.data/app-state.json` change from browser testing. That file should not be casually committed as part of unrelated code work.
