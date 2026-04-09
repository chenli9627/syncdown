"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppState } from "@/features/app-state/providers/app-state-provider";
import type { User } from "@/features/app-state/types";
import { translateAppError } from "@/lib/i18n/error-messages";

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
  changePassword,
  currentUser,
  updateProfileAvatar,
  updateProfileName,
}: {
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  currentUser: User;
  updateProfileAvatar: (userId: string, avatarUrl: string | null) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateProfileName: (userId: string, name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const { locale, setLocale, t } = useLocale();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(currentUser.name);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  async function handleSaveProfile() {
    setError(null);
    setNotice(null);
    setIsSaving(true);
    const result = await updateProfileName(currentUser.id, name);
    setIsSaving(false);

    if (!result.ok) {
      setError(translateAppError(result.error, t, locale));
      return;
    }

    setNotice(t("profileUpdated"));
  }

  async function handleAvatarFile(file: File) {
    setError(null);
    setNotice(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadResponse.json().catch(() => null)) as
        | { error?: string; ok?: boolean; src?: string }
        | null;

      if (!uploadResponse.ok || !uploadData?.ok || !uploadData.src) {
        setError(translateAppError(uploadData?.error ?? "Image upload failed", t, locale));
        return;
      }

      const result = await updateProfileAvatar(currentUser.id, uploadData.src);

      if (!result.ok) {
        setError(translateAppError(result.error, t, locale));
        return;
      }

      setNotice(t("avatarUpdated"));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  async function handlePasswordSave() {
    setPasswordError(null);
    setPasswordNotice(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError(t("passwordFieldsRequired"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    setIsUpdatingPassword(true);
    const result = await changePassword(currentUser.id, currentPassword, newPassword);
    setIsUpdatingPassword(false);

    if (!result.ok) {
      setPasswordError(translateAppError(result.error, t, locale));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordNotice(t("passwordUpdated"));
  }

  const currentTheme = theme === "system" ? "system" : resolvedTheme ?? theme ?? "system";
  const avatarLabel = currentUser.avatarUrl ? t("changeAvatar") : t("uploadAvatar");

  return (
    <div
      className="flex min-h-full flex-col p-8 md:p-10"
      style={{ background: "var(--color-page-gradient)" }}
    >
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
          <div className="flex items-center gap-4 border border-[var(--color-border)] bg-[var(--color-sidebar-panel)] px-4 py-4">
            {currentUser.avatarUrl ? (
              <Image
                alt={currentUser.name}
                className="size-16 rounded-full border border-[var(--color-border)] object-cover"
                src={currentUser.avatarUrl}
                unoptimized
                width={64}
                height={64}
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-xl font-semibold text-[var(--color-muted-foreground)]">
                {currentUser.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">{t("avatar")}</p>
              <div className="flex items-center gap-2">
                <input
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void handleAvatarFile(file);
                    }
                  }}
                  ref={avatarInputRef}
                  type="file"
                />
                <button
                  className="border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  type="button"
                >
                  {isUploadingAvatar ? t("avatarUploading") : avatarLabel}
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-name">
                {t("displayName")}
              </label>
              <input
                className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                id="settings-name"
                name="settings-name"
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

        <Section description={t("passwordSectionDescription")} title={t("password")}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-current-password">
                {t("currentPassword")}
              </label>
              <input
                autoComplete="current-password"
                className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                id="settings-current-password"
                name="settings-current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-new-password">
                {t("newPassword")}
              </label>
              <input
                autoComplete="new-password"
                className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                id="settings-new-password"
                name="settings-new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-confirm-password">
                {t("confirmNewPassword")}
              </label>
              <input
                autoComplete="new-password"
                className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none"
                id="settings-confirm-password"
                name="settings-confirm-password"
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                type="password"
                value={confirmNewPassword}
              />
            </div>
          </div>
          {passwordError ? <p className="text-sm text-[#dd5b00]">{passwordError}</p> : null}
          {passwordNotice ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">{passwordNotice}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              className="border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
              disabled={isUpdatingPassword}
              onClick={() => {
                void handlePasswordSave();
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
  const { changePassword, currentUser, ready, updateProfileAvatar, updateProfileName } = useAppState();

  if (!ready || !currentUser) {
    return null;
  }

  return (
    <SettingsContent
      changePassword={changePassword}
      currentUser={currentUser}
      key={`${currentUser.id}:${currentUser.name}`}
      updateProfileAvatar={updateProfileAvatar}
      updateProfileName={updateProfileName}
    />
  );
}
