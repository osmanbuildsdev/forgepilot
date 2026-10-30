import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentUser } from "@/server/projects/service";
import { invitePreview } from "@/server/workspaces/queries";
import { AcceptInvite } from "@/features/workspaces/accept-invite";

export const dynamic = "force-dynamic";

const roleLabels = {
  owner: "sahip",
  admin: "yönetici",
  member: "üye",
  viewer: "izleyici",
} as const;

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const invite = token.length <= 100 ? await invitePreview(token) : null;
  return (
    <main className="auth-page">
      <section className="auth-form">
        <div className="auth-box">
          <Logo />
          {invite ? (
            <>
              <h1 style={{ marginTop: 24 }}>{invite.workspace}</h1>
              <p className="muted">
                Bu çalışma alanına {roleLabels[invite.role]} olarak davet
                edildin.
              </p>
              {invite.email === user.email.toLowerCase() ? (
                <AcceptInvite token={token} />
              ) : (
                <p className="error" role="alert">
                  Bu davet {invite.email} adresi için oluşturulmuş. Şu anda{" "}
                  {user.email} ile giriş yapmışsın; doğru hesapla giriş yap.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 style={{ marginTop: 24 }}>Davet geçersiz</h1>
              <p className="muted">
                Bağlantının süresi dolmuş, iptal edilmiş ya da daha önce
                kullanılmış olabilir. Davet eden kişiden yenisini iste.
              </p>
              <Link className="button outline" href="/app">
                Uygulamaya git
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
