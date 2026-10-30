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

function GitHubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
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
      if (result.error)
        setError(
          result.error.message ??
            (register ? "Hesap oluşturulamadı." : "Giriş yapılamadı."),
        );
      else {
        router.push(nextPath());
        router.refresh();
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Veritabanı ayarlarını kontrol et.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {providers.length > 0 && (
        <>
          <div className="stack" style={{ gap: 8, marginTop: 28 }}>
            {providers.map((provider) => (
              <Button
                key={provider}
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const r = await authClient.signIn.social({
                      provider,
                      callbackURL: nextPath(),
                    });
                    if (r.error)
                      setError(r.error.message ?? "Giriş başarısız.");
                  } catch {
                    setError("Sosyal giriş başlatılamadı.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {provider === "github" ? <GitHubMark /> : <GoogleMark />}
                {provider === "github" ? "GitHub" : "Google"} ile devam et
              </Button>
            ))}
          </div>
          <div className="or-divider">veya e-posta ile</div>
        </>
      )}
      <form
        className="form-grid"
        onSubmit={submit}
        style={providers.length ? { marginTop: 0 } : undefined}
      >
        {register && (
          <label className="field">
            Ad soyad
            <input
              name="name"
              autoComplete="name"
              placeholder="Ada Yılmaz"
              required
              maxLength={100}
            />
          </label>
        )}
        <label className="field">
          E-posta
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="sen@sirket.com"
            required
          />
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
          {register && <span className="field-hint">En az 12 karakter.</span>}
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" disabled={busy} style={{ width: "100%" }}>
          {busy ? "İşleniyor…" : register ? "Hesap oluştur" : "Giriş yap"}
        </Button>
      </form>
      <p className="auth-switch">
        {register ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}{" "}
        <Link
          className="text-link"
          href={`${register ? "/login" : "/register"}${search}`}
        >
          {register ? "Giriş yap" : "Ücretsiz hesap oluştur"}
        </Link>
      </p>
    </>
  );
}
