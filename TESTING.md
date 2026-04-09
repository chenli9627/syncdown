# Syncdown Testing Checklist

This document is the manual testing checklist for the current Syncdown build.

Recommended baseline before testing:

```bash
pnpm dev
pnpm lint
pnpm test
```

Default local endpoints:

- web: `http://127.0.0.1:3000`
- collaboration websocket: `ws://127.0.0.1:1234`

## 1. Authentication

- [ ] Register a new user
- [ ] Log in with an existing user
- [ ] Log out
- [ ] Invalid login shows an error dialog
- [ ] Invalid registration shows an error dialog

## 2. Account Settings

- [ ] Open `/settings`
- [ ] Update display name
- [ ] Change password
- [ ] Upload avatar successfully
- [ ] Uploaded avatar appears in settings and sidebar
- [ ] User without avatar shows blue fallback avatar with white initial

## 3. Workspace Shell

- [ ] Open home page
- [ ] Switch workspace
- [ ] Create workspace
- [ ] Rename workspace
- [ ] Delete workspace
- [ ] Sidebar labels are correct in Chinese locale
- [ ] Sidebar sections still work without the right-side `...` on document rows

## 4. Document Creation and Naming

- [ ] Create a new document
- [ ] New document gets auto title `Untitled`
- [ ] Next new documents get `Untitled1`, `Untitled2`, etc.
- [ ] Rename a document title
- [ ] Title conflict is rejected with visible feedback

## 5. Sidebar Document Navigation

- [ ] Open a document from `最近`
- [ ] Open a document from `共享`
- [ ] Open a document from `私有`
- [ ] `废纸篓` opens correctly
- [ ] Document list rows remain clickable after removing the right-side button

## 6. Sharing and Permissions

- [ ] Owner can share a document with another user
- [ ] Share with `can_view`
- [ ] Share with `can_edit`
- [ ] Update guest permission
- [ ] Remove guest access
- [ ] Sharing with yourself is rejected
- [ ] Guest only sees explicitly shared documents
- [ ] Guest cannot see owner private docs
- [ ] Guest cannot see trash
- [ ] Guest cannot rename document title

## 7. Basic Editor Behavior

- [ ] Type plain text
- [ ] Edit headings
- [ ] Edit blockquotes
- [ ] Edit code blocks
- [ ] Use slash menu
- [ ] Use block menu
- [ ] Undo with `Ctrl/Cmd+Z`
- [ ] Redo with `Ctrl/Cmd+Y`
- [ ] `Ctrl/Cmd+Shift+Z` redo path works
- [ ] `Ctrl/Cmd+A` + delete clears document without crash

## 8. Lists

- [ ] Bulleted list input works
- [ ] Numbered list input works
- [ ] Todo list input works
- [ ] Enter behavior inside each list type feels correct
- [ ] Delete / Backspace behavior is acceptable for current product expectations

## 9. Tables

- [ ] Insert table
- [ ] Edit table cells
- [ ] Add row
- [ ] Add column
- [ ] Row actions menu works
- [ ] Column actions menu works
- [ ] Delete table works

## 10. Images and Media

- [ ] Upload image from action menu
- [ ] Paste image from clipboard
- [ ] Drag image file into editor
- [ ] Inserted image renders correctly
- [ ] Download image works
- [ ] Delete image works
- [ ] Avatar upload works
- [ ] Existing `/api/media/...` images still render

## 11. Markdown Import / Export

- [ ] Export plain document as `.md`
- [ ] Export image document as `.zip`
- [ ] Exported zip contains `page.md`
- [ ] Exported zip contains `assets/` images
- [ ] Import `.md` works
- [ ] Import `.zip` works
- [ ] Unsupported markdown shows error dialog
- [ ] Invalid zip structure shows error dialog

## 12. AI Actions

- [ ] Select text and trigger AI bubble
- [ ] AI action returns content successfully
- [ ] AI result inserts into editor correctly
- [ ] AI failure shows modal error dialog
- [ ] Error dialog closes other bubbles / menus

## 13. Collaboration

- [ ] Open the same document in two browser windows
- [ ] Text syncs in real time
- [ ] Image insertion syncs in real time
- [ ] Presence avatars show beside the active block
- [ ] Owner and guest collaboration respects permissions

## 14. Trash

- [ ] Move document to trash
- [ ] Trashed document appears in `废纸篓`
- [ ] Restore document from trash
- [ ] Restore collision renames document correctly
- [ ] Permanently delete document

## 15. Error Handling and Modals

- [ ] Login errors show as blocking modal dialogs
- [ ] Registration errors show as blocking modal dialogs
- [ ] Settings errors show as blocking modal dialogs
- [ ] Sharing / permission errors show as blocking modal dialogs
- [ ] Editor action errors show as blocking modal dialogs
- [ ] Background UI is not clickable while a modal is open

## 16. Visual and Localization Checks

- [ ] Login page slogan and logo layout look correct
- [ ] Login page brand typography uses the intended serif style
- [ ] `New User?` / `Existing User?` links look correct
- [ ] Chinese copy is correct in sidebar and major dialogs
- [ ] Default avatars use blue background consistently

## 17. Regression Checks

- [ ] Hydration warning noise does not block app use
- [ ] Export still includes images after recent fixes
- [ ] Drag-and-drop image upload still works after recent fixes
- [ ] New documents never appear with empty title
