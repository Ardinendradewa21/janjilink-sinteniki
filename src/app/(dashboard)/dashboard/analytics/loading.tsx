// ─── Loading skeleton untuk halaman analytics ────────────────────────────────
export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Skeleton stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200" />
        ))}
      </div>
      {/* Skeleton grafik */}
      <div className="h-64 animate-pulse rounded-2xl bg-stone-200" />
    </div>
  );
}
