import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "FinanceFlow - Personal Finance & AI Voice Assistant",
  description: "Production-grade personal finance management application with offline PWA support and natural language AI voice assistant.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinanceFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#131621",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
