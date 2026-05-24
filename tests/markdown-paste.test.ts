import test from "node:test";
import assert from "node:assert/strict";
import { shouldParseMarkdownPaste } from "../src/features/editor/lib/markdown-paste";
import { markdownToEditorHtml } from "../src/features/editor/lib/markdown";

test("detects structured markdown document paste", () => {
  const markdown = `# 北京旅行计划

北京是一座历史与现代交融的城市。北京有很多值得去的地方。

## 景点
- 故宫
- 天坛
- 颐和园

## 美食
- 烤鸭
- 炸酱面

## 行程表
| 日期 | 地点 | 备注 |
| --- | --- | --- |
| Day 1 | 故宫 | 提前预约 |
| Day 2 | 天坛 | 早点出发 |

## 任务
- [ ] 订酒店
- [x] 买车票

官网：[北京文旅](https://example.com)

~~旧计划：去动物园~~`;

  assert.equal(shouldParseMarkdownPaste(markdown), true);
});

test("does not treat ordinary multiline prose as markdown paste", () => {
  assert.equal(
    shouldParseMarkdownPaste("第一行普通文字\n第二行普通文字\n第三行普通文字"),
    false,
  );
});

test("detects multiline markdown with inline syntax from plain-text clipboard", () => {
  const markdown = `北京旅行计划

官网：[北京文旅](https://example.com)

~~旧计划：去动物园~~`;

  assert.equal(shouldParseMarkdownPaste(markdown), true);
});

test("does not parse markdown paste with local image assets", () => {
  assert.equal(
    shouldParseMarkdownPaste("![Local](assets/example.png)"),
    false,
  );
});

test("accepts mixed markdown text with autolinks and unsupported plain-text tables", () => {
  const markdown = `# Task list

## To Do

|To Do|Description|Category|Estimated Time|
|-|-|-|-|
|Reading *The Pale Dot*|1. dsdf  2. sdf| | |

## Doing

|Doing|Contents|Description|
|-|-|-|
|Reading *The Pale Dot*| | |

## Done

|Done|Contents|Description|
|-|-|-|
|Reading *The Pale Dot*| | |

# 北京旅行计划

  北京是一座历史与现代交融的城市。北京有很多值得去的地方。

## 景点

- 故宫

- 天坛

- 颐和园

## 美食

- 烤鸭

- 炸酱面

## 行程表

  ┌───────┬──────┬──────────┐

  │ 日期  │ 地点 │ 备注     │

  ├───────┼──────┼──────────┤

  │ Day 1 │ 故宫 │ 提前预约 │

  │ Day 2 │ 天坛 │ 早点出发 │

  └───────┴──────┴──────────┘

## 任务

- [ ] 订酒店

- [x] 买车票

  官网：北京文旅 (<https://example.com>)

  旧计划：去动物园`;

  assert.equal(shouldParseMarkdownPaste(markdown), true);

  const html = markdownToEditorHtml(markdown);
  assert.match(html, /<h1>Task list<\/h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /<h2>景点<\/h2>/);
  assert.match(html, /<a href="https:\/\/example\.com">https:\/\/example\.com<\/a>/);
  assert.match(html, /┌───────┬──────┬──────────┐/);
});
