import { SettingsTabs } from "@/features/settings/settings-tabs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <header className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <h1>Ayarlar</h1>
        </div>
      </header>
      <SettingsTabs />
      {children}
    </div>
  );
}
