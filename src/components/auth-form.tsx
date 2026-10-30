"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
// Only same-site relative paths are honoured to avoid open redirects.
function nextPath() {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\")
    ? n
    : "/app";
}
export function AuthForm({
  register,
  providers,
}: {
  register?: boolean;
  providers: ("google" | "github")[];
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => setSearch(window.location.search), []);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const data = {
      email: String(f.get("email")),
      password: String(f.get("password")),
    };
    try {
      const result = register
        ? await authClient.signUp.email({
            ...data,
            name: String(f.get("name")),
          })
        : await authClient.signIn.email(data);
      if (result.error) setError(result.error.message ?? "Giriş yapılamadı.");
      else {
        router.push(nextPath());
        router.refresh();
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Veritabanı ayarlarını kontrol edin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="form-grid" onSubmit={submit}>
        {register && (
          <label className="field">
            Adın
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
        )}
        <label className="field">
          E-posta
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Parola
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
            required
          />
          {register && <span className="muted">En az 12 karakter.</span>}
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {busy ? "İşleniyor…" : register ? "Hesap oluştur" : "Giriş yap"}
        </Button>
      </form>
      {providers.length > 0 && (
        <div className="stack">
          {providers.map((provider) => (
            <Button
              key={provider}
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await authClient.signIn.social({
                    provider,
                    callbackURL: nextPath(),
                  });
                  if (r.error) setError(r.error.message ?? "Giriş başarısız.");
                } catch {
                  setError("Sosyal giriş başlatılamadı.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {provider === "github" ? "GitHub" : "Google"} ile devam et
            </Button>
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        {register ? "Zaten hesabın var mı?" : "Yeni bir başlangıç mı?"}{" "}
        <Link
          href={`${register ? "/login" : "/register"}${search}`}
          style={{ color: "var(--accent)" }}
        >
          {register ? "Giriş yap" : "Hesap oluştur"}
        </Link>
      </p>
    </>
  );
}
