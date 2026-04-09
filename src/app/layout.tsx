import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  const localeCookie = cookieStore.get("syncdown-locale")?.value;
  const initialLocale: Locale =
    localeCookie === "zh" || localeCookie === "en" ? localeCookie : defaultLocale;

  return (
    <html lang={initialLocale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body>
        <AppProviders initialLocale={initialLocale}>{children}</AppProviders>
      </body>
    </html>
  );
}
