import { AuthPage } from "@/components/auth-page";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Hesap oluştur" };
export const dynamic = "force-dynamic";
export default function Page() {
  return <AuthPage register />;
}
