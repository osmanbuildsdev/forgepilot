import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty" style={{ margin: 60 }}>
      <h1>Burada bir şey bulamadık.</h1>
      <Link className="button primary" href="/app">
        Çalışma alanına dön
      </Link>
    </main>
  );
}
