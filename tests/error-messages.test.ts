import test from "node:test";
import assert from "node:assert/strict";
import { translateAppError } from "../src/lib/i18n/error-messages";
import { getMessage } from "../src/lib/i18n/messages";

test("translates exact mapped errors", () => {
  const translated = translateAppError(
    "Workspace name already exists",
    (key) => getMessage("zh", key),
    "zh",
  );

  assert.equal(translated, "Workspace 名称已存在");
});

test("translates zip prefix errors and preserves file details", () => {
  const translated = translateAppError(
    "Zip archive contains unreferenced files: assets/extra.png",
    (key) => getMessage("en", key),
    "en",
  );

  assert.equal(translated, "Zip archive contains unreferenced files: assets/extra.png");
});

test("translates zip archive structure errors", () => {
  const translated = translateAppError(
    "Zip archive must contain exactly one Markdown file",
    (key) => getMessage("zh", key),
    "zh",
  );

  assert.equal(translated, "Zip 包必须且只能包含一个 Markdown 文件");
});

test("falls back to original error when no mapping exists", () => {
  const translated = translateAppError(
    "Completely custom failure",
    (key) => getMessage("en", key),
    "en",
  );

  assert.equal(translated, "Completely custom failure");
});
