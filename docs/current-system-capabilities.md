# Syncdown Current System Capabilities

This document records what the current Syncdown system can do today, based on the implemented product scope and current codebase behavior.

## 1. Account and Session

- Log in with `username + password`
- Register a new account with `email`, `username`, `name`, and `password`
- Validate account inputs:
  - email required, lower-cased, no Chinese characters
  - username required, lower-cased, no Chinese characters, letters/numbers/underscore only
  - password minimum 8 characters, no Chinese characters
- Log out
- Reset password through the CLI
- Open a real `Settings` page
- Update profile display name
- Upload or replace avatar
- Change password
- Switch interface language between Chinese and English
- Switch theme

## 2. Workspace Model

- Automatically create a default workspace for a new owner account
- Show the current workspace in the left sidebar
- Create a new workspace
- Rename a workspace
- Delete a workspace with confirmation
- Automatically recreate `Default` if the last owned workspace is deleted
- Switch between accessible workspaces
- Support workspace-relative identity:
  - `owner`
  - `guest`
- Show guest badge in guest workspaces

## 3. Document Organization

- Open a `Home` view for the current workspace
- Show `Recents`, `Shared`, `Private`, and `Trash` sections
- Create a new document as workspace owner
- Route directly into the new document after creation
- Focus the title field immediately for newly created documents
- Keep recent visits per user
- Move documents between `Private` and `Shared` based on sharing state
- Keep trash workspace-scoped and owner-only

## 4. Permissions and Sharing

- Share a document with an existing user
- Restrict sharing to workspace owners
- Support document guest permissions:
  - `can_edit`
  - `can_view`
- Update a guest's permission
- Remove a guest from a document
- Automatically move a shared document back to `Private` when the last guest is removed
- Prevent sharing a document with yourself
- Prevent guests from editing document titles
- Prevent `can_view` users from editing body content

## 5. Editor and Writing

- Edit rich text documents with Tiptap
- Edit document title inline
- Autosave document content
- Show save state such as saving/saved
- Support slash menu
- Support block menu
- Support block transform actions:
  - paragraph
  - headings
  - bullet list
  - ordered list
  - todo list
  - quote
  - code block
  - divider
  - table
  - table of contents
- Insert blocks above
- Duplicate blocks
- Delete blocks
- Drag blocks
- Place the cursor into the matching block when clicking the left gutter area
- Search inside the current document
- Undo changes

## 6. Tables, Images, and Media

- Insert images
- Upload images through the editor
- Drag and drop images into the editor
- Download images
- Persist managed media behind `/api/media/...`
- Support local or S3-compatible media storage backends
- Insert and edit tables
- Add/remove/move table rows
- Add/remove/move table columns
- Show table row and column action handles

## 7. Import and Export

- Import Markdown from `.md`
- Import Markdown packages from `.zip`
- Validate Markdown import constraints
- Reject unsupported Markdown constructs explicitly
- Export document content
- Keep managed media references normalized during import/export

## 8. AI Features

- Open an AI selection bubble from selected text
- Run built-in AI actions:
  - improve writing
  - explain
  - reformat
  - summarize
  - custom prompt
- Generate one or more AI candidate results
- Compare candidate results
- Apply a result to replace the selection
- Insert a result below the current block
- Support primary/secondary model comparison on the server side

## 9. Collaboration

- Real-time collaborative editing using `Yjs + Tiptap Collaboration + Hocuspocus`
- Sync document body content across multiple clients
- Use document-scoped collaboration rooms
- Sync awareness / active collaborator state
- Show collaborator avatars beside the block being edited
- Hide remote text caret markers intentionally
- Avoid custom polling-based presence logic

## 10. History, Updates, and Trash

- Save version history snapshots for document content
- Restore a selected historical version
- Show a version history panel with text diff preview
- Show an updates panel with added/removed content summaries
- Merge nearby autosaves into a stable history model
- Restore a trashed document
- Permanently delete a trashed document
- Show paginated lists for:
  - updates
  - version history
  - trash items

## 11. Persistence and Runtime

- Persist app state to PostgreSQL when `DATABASE_URL` is configured
- Fall back to `.data/app-state.json` when `DATABASE_URL` is not configured
- Normalize old managed media URLs back to `/api/media/...`
- Run the web app locally on `http://127.0.0.1:3000`
- Run the collaboration websocket locally on `ws://127.0.0.1:1234`

## 12. Current Boundaries

The current system does not treat these as supported product capabilities:

- legacy-v1 restoration
- custom presence polling
- unsupported Markdown compatibility beyond the current importer rules
- arbitrary role systems beyond workspace-relative `owner` and `guest`
