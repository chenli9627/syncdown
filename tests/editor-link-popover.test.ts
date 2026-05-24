import test from "node:test";
import assert from "node:assert/strict";
import {
  getPreferredLinkText,
  normalizeHref,
} from "../src/features/editor/components/editor-link-popover";

test("normalizeHref preserves document anchor hashes", () => {
  assert.equal(normalizeHref("#一项目介绍"), "#一项目介绍");
});

test("normalizeHref still prefixes plain domains", () => {
  assert.equal(normalizeHref("example.com"), "https://example.com");
});

test("getPreferredLinkText preserves the user's raw href text", () => {
  assert.equal(getPreferredLinkText("", "", "google.com"), "google.com");
  assert.equal(
    getPreferredLinkText("", "", "http://somewebsite.com"),
    "http://somewebsite.com",
  );
});
