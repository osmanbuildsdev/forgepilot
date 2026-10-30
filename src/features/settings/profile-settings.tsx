"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const providerNames: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

export function ProfileSettings({
  name,
  email,
  hasPassword,
  providers,
}: {
  name: string;
  email: string;
  hasPassword: boolean;
  providers: string[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState({ busy: false, error: "", done: "" });
  const [password, setPassword] = useState({
    busy: false,
    error: "",
    done: "",
  });

  return (
    <div className="stack">
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const value = String(
            new FormData(e.currentTarget).get("name"),
          ).trim();
          if (value.length < 2) {
            setProfile({
              busy: false,
              error: "Ad en az 2 karakter olmalı.",
              done: "",
            });
            return;
          }
          setProfile({ busy: true, error: "", done: "" });
          const r = await authClient
            .updateUser({ name: value.slice(0, 100) })
            .catch(() => null);
          if (!r || r.error) {
            setProfile({
              busy: false,
              error: "Profil güncellenemedi.",
              done: "",
            });
            return;
          }
          setProfile({ busy: false, error: "", done: "Kaydedildi." });
          router.refresh();
        }}
      >
        <h2>Profil</h2>
        <label className="field">
          Ad soyad
          <input
            name="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label className="field">
          E-posta
          <input value={email} readOnly disabled />
          <span className="field-hint">
            Davetler bu adrese göre eşleşir. E-posta değişikliği doğrulama
            e-postası gerektirdiği için şimdilik desteklenmiyor.
          </span>
        </label>
        {providers.length > 0 && (
          <p className="muted" style={{ fontSize: 13 }}>
            Bağlı giriş yöntemleri:{" "}
            {providers.map((p) => providerNames[p] ?? p).join(", ")}
          </p>
        )}
        {profile.error && (
          <p className="error" role="alert">
            {profile.error}
          </p>
        )}
        <div className="row">
          <Button disabled={profile.busy}>
            {profile.busy ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          {profile.done && (
            <span className="subtle" role="status">
              {profile.done}
            </span>
          )}
        </div>
      </form>

      {hasPassword ? (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const next = String(f.get("newPassword"));
            if (next !== String(f.get("confirm"))) {
              setPassword({
                busy: false,
                error: "Yeni parolalar eşleşmiyor.",
                done: "",
              });
              return;
            }
            setPassword({ busy: true, error: "", done: "" });
            const r = await authClient
              .changePassword({
                currentPassword: String(f.get("currentPassword")),
                newPassword: next,
                revokeOtherSessions: f.get("revoke") === "on",
              })
              .catch(() => null);
            if (!r || r.error) {
              setPassword({
                busy: false,
                error:
                  "Parola değiştirilemedi. Mevcut parolanı kontrol et; yeni parola en az 12 karakter olmalı.",
                done: "",
              });
              return;
            }
            form.reset();
            setPassword({
              busy: false,
              error: "",
              done: "Parola değiştirildi.",
            });
          }}
        >
          <h2>Parola</h2>
          <label className="field">
            Mevcut parola
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              Yeni parola
              <input
                name="newPassword"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              Yeni parola (tekrar)
              <input
                name="confirm"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>
          <label className="row" style={{ gap: 8, fontSize: 13 }}>
            <input type="checkbox" name="revoke" defaultChecked />
            Diğer cihazlardaki oturumları kapat
          </label>
          {password.error && (
            <p className="error" role="alert">
              {password.error}
            </p>
          )}
          <div className="row">
            <Button disabled={password.busy}>
              {password.busy ? "Değiştiriliyor…" : "Parolayı değiştir"}
            </Button>
            {password.done && (
              <span className="subtle" role="status">
                {password.done}
              </span>
            )}
          </div>
        </form>
      ) : (
        <section className="panel">
          <h2>Parola</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Bu hesap {providers.map((p) => providerNames[p] ?? p).join(" / ")}{" "}
            ile açıldı; parola kullanılmıyor.
          </p>
        </section>
      )}
    </div>
  );
}
