import test from "node:test";
import assert from "node:assert/strict";
import { diffVersionText } from "../src/features/editor/lib/version-history";

test("diffs chinese text at character granularity", () => {
  const parts = diffVersionText("这是我的建议哦", "这是我的真诚建议哦");

  assert.deepEqual(parts, [
    { text: "这是我的", type: "unchanged" },
    { text: "真诚", type: "added" },
    { text: "建议哦", type: "unchanged" },
  ]);
});

test("marks removed text separately from unchanged text", () => {
  const parts = diffVersionText("This is old advice.", "This is advice.");

  assert.deepEqual(parts, [
    { text: "This is ", type: "unchanged" },
    { text: "old ", type: "removed" },
    { text: "advice.", type: "unchanged" },
  ]);
});
