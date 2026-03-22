// ─── Loading skeleton untuk halaman daftar booking ───────────────────────────
export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-200" />
      ))}
    </div>
  );
}
