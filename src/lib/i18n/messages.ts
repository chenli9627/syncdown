export type Locale = "zh" | "en";

export const defaultLocale: Locale = "zh";

export const messages = {
  zh: {
    appName: "Syntext",
    login: "登录",
    register: "注册",
    home: "Home",
    recents: "Recents",
    shared: "Shared",
    private: "Private",
    trash: "Trash",
    settings: "设置",
    tagline: "Workspace-first writing and sharing.",
    noAccessTitle: "没有权限",
    noAccessNotice: "你已无法访问该文档。",
    deletedTitle: "已删除",
    deletedDescription: "该文档已被删除，当前位于废纸篓中。",
    ai: "AI",
    improveWriting: "润色",
    explain: "解释",
    reformat: "重组",
    summarize: "总结",
    customPrompt: "自定义指令",
    customPromptPlaceholder: "告诉 AI 你想怎么处理这段内容",
    generate: "生成",
    apply: "替换选区",
    insertBelow: "插入下方",
    discard: "关闭",
    aiPreview: "AI 预览",
    aiSelectionEmpty: "请先选中文本",
  },
  en: {
    appName: "Syntext",
    login: "Log in",
    register: "Sign up",
    home: "Home",
    recents: "Recents",
    shared: "Shared",
    private: "Private",
    trash: "Trash",
    settings: "Settings",
    tagline: "Workspace-first writing and sharing.",
    noAccessTitle: "No access",
    noAccessNotice: "You no longer have access to this document.",
    deletedTitle: "Deleted",
    deletedDescription: "This document has been deleted and is currently in Trash.",
    ai: "AI",
    improveWriting: "Improve Writing",
    explain: "Explain",
    reformat: "Reformat",
    summarize: "Summarize",
    customPrompt: "Custom Prompt",
    customPromptPlaceholder: "Tell AI how to transform this selection",
    generate: "Generate",
    apply: "Replace selection",
    insertBelow: "Insert below",
    discard: "Close",
    aiPreview: "AI Preview",
    aiSelectionEmpty: "Select some text first",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)[Locale];

export function getMessage(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}
