import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { brand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.displayName} — ${brand.tagline}`,
    template: `%s · ${brand.displayName}`,
  },
  description: brand.description,
  applicationName: brand.displayName,
  icons: {
    icon: brand.assets.appIcon,
    apple: brand.assets.appIcon,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
