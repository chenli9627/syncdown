import test from "node:test";
import assert from "node:assert/strict";
import {
  getPreferredLinkText,
  normalizeHref,
  resolveHrefForNavigation,
} from "../src/features/editor/components/editor-link-popover";

test("normalizeHref preserves document anchor hashes", () => {
  assert.equal(normalizeHref("#一项目介绍"), "#一项目介绍");
});

test("normalizeHref preserves plain domains exactly as entered", () => {
  assert.equal(normalizeHref("example.com"), "example.com");
  assert.equal(normalizeHref("  google.com "), "google.com");
});

test("resolveHrefForNavigation prefixes plain domains only when opening", () => {
  assert.equal(resolveHrefForNavigation("example.com"), "https://example.com");
  assert.equal(resolveHrefForNavigation("http://somewebsite.com"), "http://somewebsite.com");
});

test("getPreferredLinkText preserves the user's raw href text", () => {
  assert.equal(getPreferredLinkText("", "", "google.com"), "google.com");
  assert.equal(
    getPreferredLinkText("", "", "http://somewebsite.com"),
    "http://somewebsite.com",
  );
});
