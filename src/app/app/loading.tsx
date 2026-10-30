export default function Loading() {
  return (
    <div className="stack" aria-label="Yükleniyor" role="status">
      <div className="loading" />
      <div className="loading" />
      <span className="muted">Çalışma alanı yükleniyor…</span>
    </div>
  );
}
