# AI Chat Document Edit Regression Checklist

This checklist is the fixed manual regression suite for Syncdown AI chat document editing.

It is designed to verify:

- query / read behavior
- create / update / delete document mutations
- block-level edits
- inline style preservation
- structured content edits
- confirmation-before-apply behavior
- post-apply verification behavior

Use a dedicated test account and a dedicated test document. Do not run this against a real user document.

## 1. Test Setup

- Account: dedicated `codex_*` or equivalent tester account
- Document title: `AI CRUD Format Test`
- AI panel: open on the right
- Model: any supported model, record which one you used

## 2. Baseline Test Document

Paste this Markdown into a blank document:

```md
# AI 文档修改回归测试

[TOC]

## 文本样式

这是一段包含 **粗体**、*斜体*、***粗斜体***、~~删除线~~、`行内代码`、[示例链接](google.com) 和脚注[^1] 的正文。

> 这是一段引用，后续用于修改与删除。

---

## 列表区

- 无序项 A
- 无序项 B
  - 嵌套项 B-1

1. 有序项一
2. 有序项二

- [ ] 待办一
- [x] 待办二

## 代码块

```ts
const count = 1
console.log(count)
```

## 表格区

| 名称 | 链接 | 状态 |
| --- | --- | --- |
| Google | [官网](google.com) | 进行中 |
| Syncdown | [主页](https://example.com) | 已完成 |

## 脚注区

脚注引用再次出现[^1]。

[^1]: 这是脚注内容。
```

## 3. Regression Cases

### 3.1 Query / Read

Prompt:

```text
列出当前文档包含哪些块类型、文本样式和特殊格式，只要简短列表，不要修改文档。
```

Expected:

- no confirmation UI
- no document mutation
- result should mention:
  - headings
  - TOC
  - paragraph
  - blockquote
  - divider
  - bullet list
  - ordered list
  - task list
  - code block
  - table
  - footnote
  - bold / italic / bold-italic / strike / inline code / link

### 3.2 Create Block

Prompt:

```text
在“列表区”下面新增一个三级标题“新增测试”，并插入一段引用“这是新增引用”。
```

Expected:

- enters confirmation state
- after confirm:
  - insert `### 新增测试`
  - insert a blockquote with `这是新增引用`

### 3.3 Update Inline Styles

Prompt:

```text
把“文本样式”这一段中的“粗体”改成“加粗文本”，并保留粗体；把“删除线”改成“已删除”，并保留删除线。
```

Expected:

- enters confirmation state
- after confirm:
  - `粗体` -> `加粗文本`, still bold
  - `删除线` -> `已删除`, still strike-through

### 3.4 Update Table Cell and Link

Prompt:

```text
把“表格区”里 Google 那一行的“状态”改成“已验证”，把“官网”这个链接地址改成 bing.com。
```

Expected:

- enters confirmation state
- after confirm:
  - Google row status becomes `已验证`
  - `官网` label stays `官网`
  - link target changes to `bing.com` / resolved navigation target

### 3.5 Update Task Items

Prompt:

```text
取消勾选“待办二”，并勾选“待办一”。
```

Expected:

- enters confirmation state
- after confirm:
  - `待办二` unchecked
  - `待办一` checked

### 3.6 Update Code Block

Prompt:

```text
把“代码块”中的 count 改成 total，并把 1 改成 2。
```

Expected:

- enters confirmation state
- after confirm:
  - `const count = 1` -> `const total = 2`
  - `console.log(count)` -> `console.log(total)`
  - content remains inside the code block

### 3.7 Delete Block

Prompt:

```text
删除那段引用“这是一段引用，后续用于修改与删除。”
```

Expected:

- enters confirmation state
- after confirm:
  - original blockquote is removed

### 3.8 Query Links

Prompt:

```text
当前文档里有哪些链接，它们各自的显示文本和地址分别是什么？不要修改文档。
```

Expected:

- no confirmation UI
- no document mutation
- result should accurately list:
  - `示例链接`
  - `官网`
  - `主页`
- footnote references may be reported separately as internal anchors

### 3.9 Update Footnote Definition

Prompt:

```text
把脚注定义内容改成“这是更新后的脚注内容”，并保留脚注引用关系。
```

Expected:

- enters confirmation state
- after confirm:
  - footnote definition updates
  - footnote references still point to the same definition

## 4. Pass / Fail Rules

Mark a case as failed if any of these happen:

- AI says it modified the document, but the DOM did not actually change
- only part of a multi-target instruction was applied
- formatting was lost when the instruction explicitly required preservation
- the app says `未修改文档`, but the document was partially changed
- a read-only query enters confirmation or mutates the document

## 5. Findings from 2026-05-25 Manual Run

Environment:

- account: dedicated tester account `Codex AI Ops Tester`
- document: `AI CRUD Format Test`
- model: `deepseek-v4-flash`

Results:

- passed:
  - query document structure
  - create heading + quote
  - inline style preservation edits
  - table cell edit
  - table link edit
  - delete blockquote
  - query links
  - footnote definition edit
- failed:
  - task-list multi-edit:
    - `待办二` was unchecked
    - `待办一` was not checked
  - code-block multi-edit:
    - `const count = 1` changed to `const total = 2`
    - `console.log(count)` did not change to `console.log(total)`
    - the system reported `未修改文档：修改后校验未通过`
    - but the document had already been partially changed
- accuracy issue:
  - structure query overclaimed that the table included merged / spanning cells when it did not

## 6. Priority Follow-up

Highest-priority fixes:

1. multi-target task-list edits must apply all requested mutations
2. code-block edits must not partially commit when verification fails
3. read-only query responses should avoid unsupported structural claims
