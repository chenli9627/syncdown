"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  getMessage,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/messages";

const STORAGE_KEY = "syncdown.locale";
const COOKIE_KEY = "syncdown-locale";
const localeListeners = new Set<() => void>();

let localeSnapshot: Locale | null = null;

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);

  return () => {
    localeListeners.delete(listener);
  };
}

function emitLocaleChange() {
  localeListeners.forEach((listener) => listener());
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
}: LocaleProviderProps) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => localeSnapshot ?? initialLocale,
    () => initialLocale,
  );

  const setLocale = useCallback((nextLocale: Locale) => {
    if (typeof window === "undefined") {
      return;
    }

    localeSnapshot = nextLocale;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `${COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    emitLocaleChange();
  }, []);

  useEffect(() => {
    localeSnapshot = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => getMessage(locale, key),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
