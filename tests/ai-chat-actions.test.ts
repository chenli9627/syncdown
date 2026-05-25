import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inferAiChatClarification,
  inferAiChatDocumentAction,
  inferAiChatResponseMode,
  isAiChatClarificationCancelPrompt,
  resolveAiChatClarifiedPrompt,
} from "../src/features/editor/lib/ai-chat-actions";

test("infers insert-end action from Chinese document placement requests", () => {
  assert.equal(
    inferAiChatDocumentAction(
      "给我一个 deepseek-v4-flash 和 deepseek-v4-pro 区别的表格，放到文档末尾",
    ),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("将总结放入文档末尾并添加标题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把总结追加到最后"), "edit_blocks");
});

test("infers insert-end action from English document placement requests", () => {
  assert.equal(
    inferAiChatDocumentAction("Make a comparison table and append it to the end of the document"),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("Please add this at the document bottom"), "edit_blocks");
});

test("infers insert-cursor action from cursor placement requests", () => {
  assert.equal(inferAiChatDocumentAction("生成一句摘要，插入到光标处"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把下面这句话加到当前位置"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Insert a short summary at the cursor"), "edit_blocks");
});

test("infers replace-selection action from selected text edit requests", () => {
  assert.equal(
    inferAiChatDocumentAction("把选中的内容改写得更正式", { hasSelection: true }),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("润色当前选区", { hasSelection: true }), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("Translate the selected text to English", { hasSelection: true }),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("把选中的内容改写得更正式"), null);
});

test("infers replace-selection action from broad edit prompts when text is selected", () => {
  assert.equal(inferAiChatDocumentAction("改得更正式一点", { hasSelection: true }), null);
  assert.equal(inferAiChatDocumentAction("Translate this to English", { hasSelection: true }), null);
});

test("routes whole-document edit requests through guarded block edits", () => {
  assert.equal(inferAiChatDocumentAction("把当前文档整理成会议纪要"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Rewrite this document in a more formal tone"), "edit_blocks");
});

test("infers block-edit action from follow-up repair prompts after document edits", () => {
  assert.equal(inferAiChatDocumentAction("修复一下"), null);
  assert.equal(
    inferAiChatDocumentAction("修复一下", { hasRecentDocumentAction: true }),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("按你说的方案修改", { hasRecentDocumentAction: true }),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("It did not work. Fix it.", { hasRecentDocumentAction: true }),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("撤回上一个操作", { hasRecentDocumentAction: true }),
    null,
  );
  assert.equal(
    inferAiChatDocumentAction("undo the last edit", { hasRecentDocumentAction: true }),
    null,
  );
});

test("infers block-edit action from explicit error correction requests", () => {
  assert.equal(inferAiChatDocumentAction("修改错误"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把错误改掉"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("修复文档里的问题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Fix the mistakes in the document"), "edit_blocks");
});

test("infers block-edit action from previous assistant content insertion requests", () => {
  assert.equal(inferAiChatDocumentAction("把景点表格添加到文档中"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把刚才的表格添加到文档中"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把上面的内容加入文档"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("将这些景点说明写入文档"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("整理为列表，放到文档中"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("整理成表格放到文档中"), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("Add the previous recommendations table to the document"),
    "edit_blocks",
  );
});

test("infers block-edit action from document-scoped local deletions", () => {
  assert.equal(inferAiChatDocumentAction("删除这篇文档里重复的内容"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("删除北京简介里的引用标注"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("删除当前文档中的最后一段"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("删掉这个东西"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("删除它"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("去掉这些引用标注"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Remove duplicate paragraphs from this document"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Delete it"), "edit_blocks");
});

test("infers block-edit action from special placement requests", () => {
  assert.equal(inferAiChatDocumentAction("生成一个风险表格，放到方案下面"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("在第二段之前插入一个摘要"), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("看一下今天的微博热搜榜前十，做成表格放到文档中"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("Create a comparison table under the Background section"),
    "edit_blocks",
  );
});

test("infers block-edit action from targeted block edit requests", () => {
  assert.equal(inferAiChatDocumentAction("删除包含“临时风险：Gamma。”的段落"), "edit_blocks");
  assert.equal(
    inferAiChatDocumentAction("把包含“当前方案：Beta。”的段落改成“当前方案：Beta 已升级。”"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把列表项目里的 Gamma 改成 Gamma-1，保留列表格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把粗体里的 Alpha 改成 Alpha-1，保留粗体格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把删除线里的 Alpha 改成 Alpha-1，保留删除线格式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把链接里的 Alpha 改成 Alpha-1，保留链接。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把原文里的表格改成三列表格，保留原来的数据。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("修改当前段落，语气更正式。"),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("Update the original table to include sources"),
    "edit_blocks",
  );
  assert.equal(inferAiChatDocumentAction("把第二个标题改成三级标题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把标题层级调整为二级"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把标题都缩小一个等级"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Change the Background heading level to H3"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把 Alpha 设为粗体"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把所有的北京都加粗"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("给官网两个字加上链接"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把表格第二行第三列改成 Done"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Make Alpha bold and update its link"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把风险表格移动到方案下面"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把所有 Alpha 替换成 Beta"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把第二个列表转成任务列表"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("勾选包含发布的任务项"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("给表格新增一列"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Delete the paragraph containing Gamma"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("给文档添加小标题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把文档加上小标题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Add subheadings to this document"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("给每段加一个三级标题"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("把每个段弄一个三级heading"), "edit_blocks");
  assert.equal(inferAiChatDocumentAction("Add an H3 before every paragraph"), "edit_blocks");
});

test("infers block-edit action from exact replacements that match current document text", () => {
  assert.equal(
    inferAiChatDocumentAction("把烤鸭改成北京烤鸭。", {
      documentBlocks: [
        {
          id: "block_food",
          markdown: "- 烤鸭\n- 炸酱面",
          text: "烤鸭炸酱面",
          type: "bulletList",
        },
      ],
      documentText: "北京旅行计划\n美食\n烤鸭\n炸酱面",
    }),
    "edit_blocks",
  );
  assert.equal(
    inferAiChatDocumentAction("把 qwen 模型改成 deepseek。", {
      documentText: "北京旅行计划\n美食\n烤鸭\n炸酱面",
    }),
    null,
  );
});

test("infers block-edit action from table-context replacements in the current document", () => {
  assert.equal(
    inferAiChatDocumentAction("把 Day 2 的备注改成午后出发。", {
      documentBlocks: [
        {
          html: "<table><tr><th>日期</th><th>地点</th><th>备注</th></tr><tr><td>Day 2</td><td>天坛</td><td>早点出发</td></tr></table>",
          id: "block_table",
          markdown: "| 日期 | 地点 | 备注 |\n| --- | --- | --- |\n| Day 2 | 天坛 | 早点出发 |",
          text: "日期地点备注Day 2天坛早点出发",
          type: "table",
        },
      ],
      documentText: "行程表\nDay 2\n天坛\n早点出发",
    }),
    "edit_blocks",
  );
});

test("does not infer document actions for ordinary chat prompts", () => {
  assert.equal(inferAiChatDocumentAction("解释一下这篇文档"), null);
  assert.equal(inferAiChatDocumentAction("What are the differences between these models?"), null);
  assert.equal(inferAiChatDocumentAction("把标题改成项目计划"), null);
});

test("does not infer document actions from negative edit instructions", () => {
  assert.equal(inferAiChatDocumentAction("只回答当前文档包含哪些部分，不要修改文档。"), null);
  assert.equal(inferAiChatDocumentAction("总结一下当前内容，不改动文档"), null);
  assert.equal(inferAiChatDocumentAction("Only answer what sections exist. Do not edit the document."), null);
});

test("does not allow whole-document replacement actions", () => {
  assert.equal(inferAiChatDocumentAction("Update the current document in a formal tone"), "edit_blocks");
});

test("infers response modes for transform-only chat prompts", () => {
  assert.equal(inferAiChatResponseMode("整理为列表"), "list");
  assert.equal(inferAiChatResponseMode("整理成表格"), "table");
  assert.equal(inferAiChatResponseMode("提炼为要点"), "key_points");
  assert.equal(inferAiChatResponseMode("Explain Hangzhou"), null);
});

test("asks for clarification when insertion source is missing", () => {
  assert.deepEqual(inferAiChatClarification("整理为列表，放到文档中"), {
    kind: "missing_insert_source",
    originalPrompt: "整理为列表，放到文档中",
  });
  assert.deepEqual(inferAiChatClarification("把景点表格添加到文档中"), {
    kind: "missing_insert_source",
    originalPrompt: "把景点表格添加到文档中",
  });
});

test("does not ask for clarification when insertion source is available", () => {
  assert.equal(
    inferAiChatClarification("整理为列表，放到文档中", {
      hasRecentAssistantAnswer: true,
    }),
    null,
  );
  assert.equal(
    inferAiChatClarification("看一下今天的微博热搜榜前十，做成表格放到文档中"),
    null,
  );
});

test("asks for clarification when document edit target is ambiguous", () => {
  assert.deepEqual(inferAiChatClarification("删掉这个东西"), {
    kind: "ambiguous_document_target",
    originalPrompt: "删掉这个东西",
  });
  assert.deepEqual(inferAiChatClarification("Delete it"), {
    kind: "ambiguous_document_target",
    originalPrompt: "Delete it",
  });
});

test("does not ask for clarification when ambiguous target can use selection or recent edit", () => {
  assert.equal(inferAiChatClarification("删掉这个东西", { hasSelection: true }), null);
  assert.equal(
    inferAiChatClarification("删掉这个东西", { hasRecentDocumentAction: true }),
    null,
  );
  assert.equal(inferAiChatClarification("把所有的北京都加粗"), null);
});

test("resolves and cancels clarification follow-ups", () => {
  const clarification = inferAiChatClarification("删掉这个东西");

  assert.ok(clarification);
  assert.equal(
    resolveAiChatClarifiedPrompt(clarification, "删除当前光标所在块"),
    "删掉这个东西\n\n用户补充：删除当前光标所在块",
  );
  assert.equal(isAiChatClarificationCancelPrompt("取消"), true);
  assert.equal(isAiChatClarificationCancelPrompt("继续"), false);
});
