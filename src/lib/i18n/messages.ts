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
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)[Locale];

export function getMessage(locale: Locale, key: MessageKey) {
  return messages[locale][key];
}
