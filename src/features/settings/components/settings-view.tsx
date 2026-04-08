"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import type { User } from "@/features/app-state/types";

function Section({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      <div className="space-y-5 px-5 py-5">{children}</div>
    </section>
  );
}

function PreferenceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`border px-3 py-2 text-sm transition ${
        active
          ? "border-[var(--color-primary)] bg-[rgba(35,131,226,0.08)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SettingsContent({
  currentUser,
  updateProfileName,
}: {
  currentUser: User;
  updateProfileName: (userId: string, name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const { locale, setLocale, t } = useLocale();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [name, setName] = useState(currentUser.name);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveProfile() {
    setError(null);
    setNotice(null);
    setIsSaving(true);
    const result = await updateProfileName(currentUser.id, name);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(t("profileUpdated"));
  }

  const currentTheme = theme === "system" ? "system" : resolvedTheme ?? theme ?? "system";

  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_22%,transparent_42%)] p-8 md:p-10">
      <div className="max-w-4xl space-y-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
          {t("settings")}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--color-muted-foreground)]">
          {t("settingsDescription")}
        </p>
      </div>

      <div className="mt-8 grid max-w-4xl gap-5">
        <Section description={t("settingsDescription")} title={t("profile")}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-name">
                {t("displayName")}
              </label>
              <input
                className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                id="settings-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("usernameLabel")}</p>
              <div className="h-10 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 text-sm leading-10 text-[var(--color-muted-foreground)]">
                {currentUser.username}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">{t("emailLabel")}</p>
              <div className="h-10 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-3 text-sm leading-10 text-[var(--color-muted-foreground)]">
                {currentUser.email}
              </div>
            </div>
          </div>
          {error ? <p className="text-sm text-[#dd5b00]">{error}</p> : null}
          {notice ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">{notice}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              className="border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
              disabled={isSaving}
              onClick={() => {
                void handleSaveProfile();
              }}
              type="button"
            >
              {t("saveChanges")}
            </button>
          </div>
        </Section>

        <Section description={t("settingsDescription")} title={t("preferences")}>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("language")}</p>
            <div className="flex flex-wrap gap-2">
              <PreferenceButton
                active={locale === "zh"}
                label="中文"
                onClick={() => setLocale("zh")}
              />
              <PreferenceButton
                active={locale === "en"}
                label="English"
                onClick={() => setLocale("en")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("theme")}</p>
            <div className="flex flex-wrap gap-2">
              <PreferenceButton
                active={theme === "system"}
                label={t("systemTheme")}
                onClick={() => setTheme("system")}
              />
              <PreferenceButton
                active={currentTheme === "light"}
                label={t("lightTheme")}
                onClick={() => setTheme("light")}
              />
              <PreferenceButton
                active={currentTheme === "dark"}
                label={t("darkTheme")}
                onClick={() => setTheme("dark")}
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { currentUser, ready, updateProfileName } = useAppState();

  if (!ready || !currentUser) {
    return null;
  }

  return (
    <SettingsContent
      currentUser={currentUser}
      key={`${currentUser.id}:${currentUser.name}`}
      updateProfileName={updateProfileName}
    />
  );
}
