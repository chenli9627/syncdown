# Syntext V2 Architecture

This document aligns the implementation architecture with `../my_plan.md`.

## 1. Rebuild Position

Syntext v2 is a rebuild, not an iteration on legacy product assumptions.

Design rule:

- use Notion as a reference for visual restraint and interaction feel, not as a source of unconfirmed product features
- keep a single consistent Syntext design language across shell, editor, popovers, and sharing surfaces
- keep the existing square-corner visual language for popovers, cards, and routine buttons unless a component has an explicit exception

Core product:

- workspace-based document ownership
- guest access through document sharing
- rich text editing with block interactions
- AI-assisted writing UI
- future-ready collaboration interfaces

What may be reused from `legacy-v1`:

- password hashing and session primitives if compatible
- PostgreSQL and object storage setup patterns
- Tiptap baseline setup patterns
- test and dev environment patterns

What must be rebuilt:

- routing and authenticated shell
- workspace switcher and workspace settings flow
- sharing and permission model
- sidebar IA
- document lifecycle rules
- editor interaction layer
- markdown import/export pipeline

## 2. Product Model

### 2.1 Workspace Identities

`owner` and `guest` are workspace-relative identities, not global user roles.

- `owner`: the user who created the workspace
- `guest`: a user who entered that workspace through document sharing
- the same user can be an owner in one workspace and a guest in another
- all permission-sensitive UI and mutations must derive `owner` from `workspace.ownerUserId`, not from document metadata alone

### 2.2 Permissions

Document permissions only have two guest levels:

- `can_edit`
- `can_view`

Rules:

- only the current workspace owner can create documents
- only the current workspace owner can share a document
- only the current workspace owner can change guest permissions
- only the current workspace owner can remove a guest from a document
- only the current workspace owner can move a document to trash
- `can_edit` can edit, use AI, import Markdown, and upload/paste images
- `can_view` is view-only, cannot rename, cannot import Markdown, and cannot see AI entry points
- `can_view` can export Markdown

### 2.3 Workspace Rules

- every user starts with a default workspace named `Default` when their first workspace is created
- workspace names only need to be unique within the same owner scope
- documents belong to exactly one workspace
- documents cannot move across workspaces
- creating a workspace switches into it immediately
- deleting a workspace permanently deletes its documents, guest access records, and object storage files
- after deleting the current workspace, switch to the first workspace in the list
- if no workspace remains, auto-create a new `Default`

### 2.4 Guest Access Rules

- a guest only enters a workspace through shared documents
- a guest must switch to that workspace to see its shared documents
- a guest only sees documents explicitly shared to them
- if a guest loses access to all documents in a workspace, that workspace disappears from their switcher
- if a guest opens an old link without permission, redirect to `Home`
- if a guest is inside a workspace that gets deleted, show `workspace 已被删除`

## 3. Document Lifecycle

### 3.1 Private and Shared

- new workspace-owner documents start in `Private`
- once shared with any guest, the document moves to `Shared`
- if all guests are removed, the document moves back to `Private`
- when a document returns to `Private`, its list timestamp updates to the return time

### 3.2 Trash

- trash is workspace-scoped
- trash is workspace-owner-only
- guest does not see trash
- the bottom sidebar `Trash` action routes to the current workspace trash page
- current workspace owner can restore documents
- current workspace owner can permanently delete documents
- permanent delete must show a confirmation modal before applying
- trash delete actions use a red destructive style for both the trigger and the confirmation button
- restored documents return to their previous `Private` or `Shared` state
- trashed documents do not reserve active workspace titles
- if a restored document title conflicts with an active document, the system auto-generates a usable restored title
- opening a deleted document link shows `已删除`
- trash list shows title plus deleted time
- if trash grows long, the list itself scrolls inside the page
- restore/delete actions should show a confirmation toast/message

### 3.3 Title Rules

- title starts blank on document creation
- if the user leaves it blank, auto-name it `Untitled`, `Untitled1`, `Untitled2`, ...
- untitled numbering is unique within the workspace
- untitled numbering only increments and never reuses gaps
- titles cannot be empty
- titles must be unique within a workspace
- titles are trimmed before save
- title edit and rename are the same operation
- only the current workspace owner can edit the document title

## 4. Auth and Validation

### 4.1 Login

- first entry route is `/login`
- login uses `username` and `password`
- page includes `New user? Sign up`
- page includes `Forget your password?`
- clicking password reset help shows the admin-reset guidance inline
- login failures should show a specific message such as `Invalid username or password`

### 4.2 Register

Required fields:

- email
- username
- name
- password

Validation rules:

- email required
- email unique
- email cannot contain Chinese characters
- email is lowercased before save
- username required
- username unique
- username immutable after registration
- username cannot contain Chinese characters
- username only allows letters, digits, and underscores
- username is lowercased before save
- username matching is case-insensitive
- name required
- name is trimmed before save
- password cannot contain Chinese characters
- password minimum length is 8

UX rules:

- registration returns to login
- page includes `Existing user? Log in`
- registration failures show specific reasons

## 5. Shell and Routes

### 5.1 Entry Routes

- `/login`
- `/register`

### 5.2 Authenticated Shell

The app shell consists of:

- fixed left sidebar
- right-side main content area
- sidebar and main content scroll independently

Sidebar areas:

- workspace profile/switcher popover trigger
- `Home`
- `Recents`
- `Shared`
- `Private`
- `Trash` for the current workspace owner only

There is no bottom sidebar `Settings` item.

### 5.3 Settings Access

Settings are reached from the top workspace/profile popover.

Settings sections:

- `Profile`
- `Preferences`

## 6. Sidebar Architecture

### 6.1 Workspace Popover

Shows:

- avatar
- the trigger card shows the current workspace avatar plus current workspace name
- guest view shows a `Guest` badge to the right of the workspace name in the trigger card
- the `Guest` badge uses a soft warm-yellow pill style
- current user settings button
- workspace list
- create workspace action
- workspace settings action
- logout

Rules:

- workspace list is ordered by recent access
- workspace list area can scroll
- switching workspaces routes the main pane back to that workspace's `Home`
- the popover should not repeat a separate header for the current workspace or the current user
- guest workspaces in the list show a `Guest` badge to the right of the workspace name
- the top workspace popover may extend beyond the sidebar width on the right
- workspace popovers and child popovers must visually overlay the main editor area when expanded
- the top workspace popover must not be visually covered by the `Home` row or other sidebar cards
- only `create workspace` remains inside the top workspace popover as a child popover
- clicking outside any open popover closes it
- popover action rows and buttons should darken on hover
- icon-only buttons should expose a hover name/tooltip
- `Settings` sits above `Log out`
- workspace settings only needs:
  - rename workspace
  - delete workspace

### 6.3 Home Row Actions

- the `Home` row sits near the top of the sidebar
- current workspace owner sees `new document` and `workspace settings` on the right side of the `Home` row
- guests do not see those two actions
- the `workspace settings` popover opens from the `Home` row settings button
- the `workspace settings` popover must overlay the top card and any neighboring sidebar panels
- the `workspace settings` popover aligns to the top edge of the `Home` row button cluster instead of opening vertically centered

### 6.2 Home

- default landing view after login
- guest entering a workspace also lands on `Home`
- if there are no recent documents, home only shows the greeting
- the client periodically syncs workspace/document state and also refreshes state when the window regains focus

### 6.3 Recents

- shows recently visited documents
- the current workspace owner can see private and shared entries for the current workspace context
- guest recents only contains currently accessible shared documents
- clicking a recent entry opens the document directly
- default count is 10
- `# show` options are 5 / 10 / 15 / 20
- max configured visible count is 20
- remaining entries are still reachable through scrolling
- this section has no sort mode

### 6.4 Shared and Private

- both render as vertical text lists
- both support collapse / expand
- both support section drag reordering in the sidebar
- both support independent scroll when content is long
- both show `No pages inside` when empty
- `Shared` default sort is `Last edited`
- `Private` default sort is `Last edited`
- guests do not see the `Private` section
- `# show` defaults to 10 and supports 5 / 10 / 15 / 20
- remaining entries beyond the configured count are still reachable through scrolling

## 7. Document Surface

### 7.1 Top Bar

Right-side document area top bar includes:

- permission button
- overflow menu

Permission button behavior:

- `Private` state shows lock + `Private`
- `Shared` state shows `Shared` + authorized user avatars

Permission popover shows:

- share email input
- permission select inline with the share input row
- share button
- access list including the current workspace owner
- enough popover width to display common email lengths and permission labels without clipping

Access list ordering:

- current workspace owner first
- all other users alphabetically

Owner-only controls inside permission popover:

- add guest
- switch guest between `can_edit` and `can_view`
- remove guest

Viewer behavior inside permission popover:

- non-owner users can inspect the access list
- non-owner users can see their own current permission
- when the last guest is removed, the document returns to `Private`

Validation rules:

- only one email may be entered at a time
- email input stays single-line and may scroll horizontally for long values
- share email is lowercased before matching
- the top permission button and permission dropdowns show a chevron indicator that flips when expanded
- sharing to self is blocked
- sharing to an already-authorized user shows `This user already has access`

### 7.2 Document Overflow Menu

Includes:

- in-document search
- undo
- import
- export

Search behavior:

- search uses a dedicated top-right button and popover, separate from the overflow menu
- browser-like search interaction
- basic highlight
- result count or `No match found` stays in the search popover header-right slot to reduce layout shift
- next / previous navigation
- pressing Enter in the search input advances to the next match
- if `next` reaches the end, wrap back to the first match
- `Ctrl+K` toggles the search surface open and closed
- `Escape` closes the search surface when it is open
- `Ctrl+Z` maps to undo within the document page
- undo controls should be disabled when there is no undo history
- clickable controls use pointer cursor on hover across the app

## 8. Editor Architecture

### 8.1 Save Model

- title and body autosave
- current version is single-user data architecture with future collaboration hooks
- do not connect Yjs real-time sync in v2 initial build

### 8.2 Create Flow

- creating a document opens it immediately
- focus starts in the title field
- blank new documents autofocus the title input on entry
- pressing Enter after title editing moves focus into body editing
- guests can edit body content according to permission, but never the title field
- the editor header area stays sticky at the top of the main content pane
- scrolling the document body must not move the editor header away
- the sticky editor header should stay visually minimal
- do not show redundant workspace name, permission label, or current block label in the sticky header
- keep title prominent but not oversized
- place save/read-only status immediately next to the title with a fixed slot to avoid layout shift
- align save/read-only status to the visual vertical center of the title row
- wrap save/read-only states in a compact tag
- keep the title cluster near the left edge and the top-right action buttons near the right edge, with only a small inset
- keep only save-state tags in the header; do not render a separate `View only` tag
- the current workspace owner can move the current document to trash from the top-right overflow menu
- after moving a document to trash from the document page, return the user to `Home`

### 8.3 Block Model

Required slash items:

- text
- heading 1
- heading 2
- heading 3
- heading 4
- bulleted list
- numbered list
- todo list
- toggle list
- quote
- table
- divider
- code

Slash menu behavior:

- keep menu typography and width restrained
- when the caret is near the lower edge of the main content viewport, open the slash menu upward
- if the slash menu becomes long, it should scroll internally

Block affordances:

- plus button for insert
- six-dots handle for block menu and drag reorder
- body content should leave enough left gutter for block controls so they do not overlap text
- keep block controls close enough to the body to remain easy to acquire with the pointer
- treat the left gutter hover area as part of the active block hover zone so controls remain stable when moving toward them

Block menu:

- turn into
- delete
- duplicate
- AI actions
- `turn into` opens as a right-side child menu
- the `turn into` child menu should touch the parent block menu edge with no visual gap
- block menu should prefer the left side of the active block to avoid covering text
- block menu must visually overlay the sidebar when needed and must not be clipped by the shell stacking order
- clicking the six-dots handle should visually highlight the active block
- hovering `turn into` opens the child menu
- the child menu should indicate the current block type
- do not include `divider` inside `turn into`

### 8.4 Selection Bubble and AI

Text bubble formatting:

- H1
- H2
- H3
- bold
- italic
- underline
- add link
- strike-through
- code mark

AI actions:

- Improve Writing
- Explain
- reformat
- summerize
- custom prompt input

AI rules:

- current build shows a selection bubble on text selection with formatting actions and an `AI` entry
- result appears in its own bubble
- replace/insert operations require confirmation
- explain/summarize are view-only outputs
- closing the AI bubble discards the result
- no AI result history in v2 initial build
- `can_view` users do not see AI entry points
- front end calls the app-owned `/api/ai/action` endpoint instead of calling model providers directly
- the back end reads `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` from environment variables
- if AI environment variables are not configured, the current build falls back to local mock results so the interaction remains usable

### 8.5 Collaboration-Ready Layer

Initial build only prepares extension points for:

- presence store
- collaborator avatar rendering
- block-level activity markers

Do not implement live Yjs sync yet.

## 9. Media and Object Storage

### 9.1 Image Insert

Supported image entry paths:

- paste from clipboard
- drag from file manager
- file upload

Supported formats:

- png
- jpg
- jpeg
- webp
- gif

Size limit:

- max 10MB per image

On failure:

- unsupported format or oversize should show an error and stop upload

Storage rule:

- uploaded images are stored in object storage

### 9.2 Image Block Actions

- copy image
- download
- duplicate
- delete

Rules:

- `copy image` copies the image binary to clipboard
- `download` downloads the original image

## 10. Markdown Import / Export

### 10.1 Import

`can_edit` can import Markdown at the current cursor position.

Current implementation milestone:

- single `.md` import is implemented first
- `.zip` import remains a later phase in the file pipeline work

Supported imports:

- single `.md`
- `.zip` containing Markdown plus assets

Single `.md` support:

- plain Markdown text
- `http/https` image links
- `data:` embedded images

Single `.md` non-support:

- local relative image references

Zip support:

- Markdown plus assets structure
- relative image references resolved from the zip contents

File size limits:

- single `.md`: 5MB
- `.zip`: 20MB

Oversize behavior:

- show `上传文件过大`

### 10.2 Export

Export default:

- `Markdown (.zip)`

Current implementation milestone:

- direct `.md` export is implemented first for the existing editor block set
- `.zip` export with assets remains a later phase in the file pipeline work

Zip output should include:

- main Markdown file
- assets directory

Markdown export should use relative image paths inside the zip package.

## 11. Localization and Themes

### 11.1 Localization

Initial defaults:

- default language: Chinese
- language options: Chinese / English

Localization scope:

- all UI copy must localize
- empty states must localize
- auth guidance must localize
- system status messages should localize

### 11.2 Theme

- theme options: Dark / Light / System
- default theme: System

## 12. Suggested App Shape

```text
syntext/
  docs/
  app/
  src/
    app/
    features/
      auth/
      workspace/
      documents/
      sharing/
      editor/
      media/
      settings/
      i18n/
    components/
    lib/
```

## 13. Build Sequence

1. scaffold app shell, routes, and i18n/theme foundations
2. implement auth and profile primitives
3. implement workspace switching, creation, rename, delete flows
4. implement document model, private/shared lifecycle, and trash
5. implement sidebar sections and list interactions
6. implement editor shell, title flow, slash menu, block handles, and autosave
7. implement permission popover and guest access enforcement
8. implement image upload and object storage integration
9. implement Markdown import/export zip pipeline
10. implement AI interaction surfaces
11. leave collaboration extension points ready for later Yjs integration
