"use client";
import { unwrap, errorMessage } from "@/lib/action-result";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createInvite,
  revokeInvite,
  changeMemberRole,
  removeMember,
} from "@/server/workspaces/actions";
import {
  canManageMembers,
  canManageRole,
  type Role,
} from "@/server/permissions";
import { Button } from "@/components/ui/button";

const roleLabels: Record<Role, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
  viewer: "İzleyici",
};

type Person = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
};
type Pending = { id: string; email: string; role: Role; expiresAt: string };

export function MembersPanel({
  workspaceId,
  myUserId,
  myRole,
  assignable,
  people,
  pending,
}: {
  workspaceId: string;
  myUserId: string;
  myRole: Role;
  assignable: Role[];
  people: Person[];
  pending: Pending[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const manage = canManageMembers(myRole);
  const inviteRoles = assignable.filter((r) => r !== "owner");

  async function run(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "İşlem tamamlanamadı."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {manage && (
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            void run(async () => {
              const token = await createInvite(workspaceId, {
                email: f.get("email"),
                role: f.get("role"),
              }).then(unwrap);
              setLink(`${window.location.origin}/invite/${token}`);
              form.reset();
            });
          }}
        >
          <h2>Kişi davet et</h2>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 2, minWidth: 220 }}>
              E-posta
              <input name="email" type="email" required maxLength={254} />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 140 }}>
              Rol
              <select name="role" defaultValue="member">
                {inviteRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">
            Davet bağlantısı 7 gün geçerlidir ve yalnızca bu e-posta adresiyle
            açılan hesap tarafından kullanılabilir. Bağlantıyı davet ettiğin
            kişiye kendin ilet.
          </p>
          <Button disabled={busy}>Davet bağlantısı oluştur</Button>
          {link && (
            <div className="stack">
              <label className="field">
                Davet bağlantısı (yalnızca şimdi gösterilir)
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(link)}
              >
                Kopyala
              </Button>
            </div>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="panel stack">
        <h2>Üyeler ({people.length})</h2>
        {people.map((p) => {
          const self = p.userId === myUserId;
          const editable = manage && !self && canManageRole(myRole, p.role);
          return (
            <div className="row between" key={p.memberId}>
              <div>
                <strong>{p.name}</strong>
                {self && <span className="muted"> (sen)</span>}
                <div className="muted">{p.email}</div>
              </div>
              <div className="row">
                {editable ? (
                  <select
                    aria-label={`${p.name} rolü`}
                    value={p.role}
                    disabled={busy}
                    onChange={(e) =>
                      run(() =>
                        changeMemberRole(
                          workspaceId,
                          p.memberId,
                          e.target.value,
                        ).then(unwrap),
                      )
                    }
                  >
                    {assignable.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="badge">{roleLabels[p.role]}</span>
                )}
                {(editable || self) && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      const ok = window.confirm(
                        self
                          ? "Bu çalışma alanından ayrılmak istediğine emin misin?"
                          : `${p.name} çalışma alanından çıkarılsın mı? Üzerindeki görev atamaları kaldırılır.`,
                      );
                      if (ok)
                        void run(async () => {
                          await removeMember(workspaceId, p.memberId).then(
                            unwrap,
                          );
                          if (self) router.push("/app");
                        });
                    }}
                  >
                    {self ? "Ayrıl" : "Çıkar"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {manage && pending.length > 0 && (
        <div className="panel stack">
          <h2>Bekleyen davetler</h2>
          {pending.map((i) => (
            <div className="row between" key={i.id}>
              <div>
                {i.email}
                <div className="muted">
                  {roleLabels[i.role]} ·{" "}
                  {new Date(i.expiresAt).toLocaleDateString("tr-TR")} tarihine
                  kadar geçerli
                </div>
              </div>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(() => revokeInvite(workspaceId, i.id).then(unwrap))
                }
              >
                İptal et
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
