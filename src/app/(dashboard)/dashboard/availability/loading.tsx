// ─── Loading skeleton untuk halaman ketersediaan ─────────────────────────────
export default function AvailabilityLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-200" />
      ))}
    </div>
  );
}
