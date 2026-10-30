"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="panel stack" style={{ maxWidth: 600, margin: "60px auto" }}>
      <h1>Bir bağlantı sorunu var.</h1>
      <p className="muted">
        İşlem tamamlanamadı. Veritabanının çalıştığından ve migration’ların
        uygulandığından emin ol.
      </p>
      <button className="button primary" onClick={reset}>
        Tekrar dene
      </button>
      <Link href="/setup">Kurulum adımlarını aç →</Link>
    </div>
  );
}
