import { AuthPage } from "@/components/auth-page";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Giriş yap" };
export const dynamic = "force-dynamic";
export default function Page() {
  return <AuthPage />;
}
