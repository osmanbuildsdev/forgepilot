import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const sans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});
const mono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "ForgePilot — Yazılım ekipleri için proje yönetimi",
    template: "%s · ForgePilot",
  },
  description:
    "Yazılım projelerini planla, görevleri yönet ve sırada ne olduğunu gör. Gemini destekli öneriler, sen onaylamadan hiçbir şeyi değiştirmez.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
