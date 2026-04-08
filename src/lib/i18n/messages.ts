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
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)[Locale];

export function getMessage(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}
