# Syncdown v2 Implementation Phases

This file tracks execution phases for the v2 rebuild.

## Phase 1: Repository and Project Foundation

Scope:

- initialize git
- scaffold project base
- establish app directory structure
- add environment templates
- add i18n and theme foundations
- persist core architecture references

Review checkpoint:

- repository is initialized
- project boots locally
- base routes exist
- development commands are documented

## Phase 2: Auth and Shell

Scope:

- build `/login`
- build `/register`
- add auth layout split
- add authenticated app shell
- add workspace/profile popover shell
- add `Home`, `Recents`, `Shared`, `Private`, `Trash` shell sections

Review checkpoint:

- login/register pages render
- authenticated shell renders
- sidebar structure matches product plan
- workspace/profile popover shell is visible

## Phase 3: Workspace and Document Lifecycle

Scope:

- implement users, workspaces, documents, access, recents, trash, media metadata
- implement default workspace rules
- implement create/rename/delete workspace flows
- implement private/shared/trash lifecycle
- implement owner/guest visibility boundaries

Review checkpoint:

- workspace switching works
- document lifecycle follows `my_plan.md`
- owner/guest access rules are enforced
- destructive workspace actions are confirmed

## Phase 4: Editor Shell and Media

Scope:

- implement title editing flow
- add Tiptap base editor
- add slash menu and block controls
- add image upload entry points
- add permission popover
- add markdown import/export pipeline shell

Review checkpoint:

- owner can create and edit documents
- guest editing/view-only boundaries are correct
- image insert flow works with limits
- markdown import/export entry points work

## Phase 5: AI and Collaboration Runtime

Scope:

- add AI bubble UI flows
- wire the backend AI route to the configured OpenAI-compatible provider
- read AI API key from environment server-side only
- migrate collaboration to the official Tiptap + Yjs stack
- use provider awareness for collaborator presence and remote cursors
- run the bundled Hocuspocus websocket server in local development

Review checkpoint:

- AI UI interactions behave as planned
- no client-side API key exposure exists
- document collaboration and awareness are live
- end-to-end behavior is stable enough for broader implementation
