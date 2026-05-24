import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { AppProviders } from "@/components/providers/app-providers";
import "@/app/globals.css";
import { defaultLocale, type Locale } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: "Syncdown",
  description: "Think quietly. Share clearly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const localeCookie = cookieStore.get("syncdown-locale")?.value;
  const initialLocale = resolveInitialLocale(
    localeCookie,
    headerStore.get("accept-language"),
  );

  return (
    <html lang={initialLocale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders initialLocale={initialLocale}>{children}</AppProviders>
      </body>
    </html>
  );
}

function resolveInitialLocale(
  localeCookie: string | null | undefined,
  acceptLanguage: string | null,
): Locale {
  if (localeCookie === "zh" || localeCookie === "en") {
    return localeCookie;
  }

  const preferredLanguage = acceptLanguage
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .find(Boolean);

  if (preferredLanguage?.startsWith("en")) {
    return "en";
  }

  if (preferredLanguage?.startsWith("zh")) {
    return "zh";
  }

  return defaultLocale;
}
