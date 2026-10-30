import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "ForgePilot — Fikirden çalışan ürüne",
    template: "%s · ForgePilot",
  },
  description:
    "Yazılım projelerini, görevlerini ve bir sonraki adımını tek bir yerde yönet.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
