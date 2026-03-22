// ─── Loading skeleton untuk halaman utama dashboard ──────────────────────────
// Muncul otomatis saat Next.js sedang fetch data server component.
// Pola: animate-pulse pada div abu untuk simulasi konten yang belum dimuat.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Skeleton header */}
      <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
      {/* Skeleton 3 kartu event type */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
