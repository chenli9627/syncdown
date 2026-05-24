import test from "node:test";
import assert from "node:assert/strict";
import {
  findHeadingForAnchor,
  handleMarkdownAnchorClick,
  normalizeMarkdownAnchor,
} from "../src/features/editor/lib/markdown-anchor-navigation";

test("normalizeMarkdownAnchor collapses punctuation and spaces", () => {
  assert.equal(normalizeMarkdownAnchor("#一、项目介绍"), "一项目介绍");
  assert.equal(normalizeMarkdownAnchor("#User Guide"), "userguide");
  assert.equal(normalizeMarkdownAnchor("#user-guide"), "userguide");
});

test("findHeadingForAnchor matches headings by normalized anchor text", () => {
  const heading = {
    textContent: "一、项目介绍",
  };
  const root = {
    querySelectorAll: () => [heading],
  };

  assert.equal(findHeadingForAnchor(root as unknown as ParentNode, "#一项目介绍"), heading);
});

test("findHeadingForAnchor supports duplicate heading suffixes", () => {
  const firstHeading = {
    textContent: "一、项目介绍",
  };
  const secondHeading = {
    textContent: "一、项目介绍",
  };
  const thirdHeading = {
    textContent: "一、项目介绍",
  };
  const root = {
    querySelectorAll: () => [firstHeading, secondHeading, thirdHeading],
  };

  assert.equal(findHeadingForAnchor(root as unknown as ParentNode, "#一项目介绍"), firstHeading);
  assert.equal(findHeadingForAnchor(root as unknown as ParentNode, "#一项目介绍-2"), secondHeading);
  assert.equal(findHeadingForAnchor(root as unknown as ParentNode, "#一项目介绍-3"), thirdHeading);
});

test("handleMarkdownAnchorClick scrolls matching heading in editor root", () => {
  const calls: string[] = [];
  const firstHeading = {
    textContent: "三、使用说明",
    scrollIntoView: () => {
      calls.push("first");
    },
  };
  const secondHeading = {
    textContent: "三、使用说明",
    scrollIntoView: () => {
      calls.push("second");
    },
  };
  const editorRoot = {
    querySelectorAll: () => [firstHeading, secondHeading],
  };
  const link = {
    getAttribute: (name: string) => (name === "href" ? "#三使用说明-2" : null),
    closest: (selector: string) => (selector === ".ProseMirror" ? editorRoot : null),
  };

  assert.equal(handleMarkdownAnchorClick(link as unknown as HTMLAnchorElement), true);
  assert.deepEqual(calls, ["second"]);
});

test("handleMarkdownAnchorClick ignores footnote hashes and missing targets", () => {
  const editorRoot = {
    querySelectorAll: () => [],
  };
  const link = {
    getAttribute: (name: string) => (name === "href" ? "#footnote-1" : null),
    closest: (selector: string) => (selector === ".ProseMirror" ? editorRoot : null),
  };

  assert.equal(handleMarkdownAnchorClick(link as unknown as HTMLAnchorElement), false);
});
