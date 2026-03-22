// ─── Loading skeleton untuk halaman profil publik ────────────────────────────
export default function PublicProfileLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-12">
      {/* Skeleton kartu profil host */}
      <div className="h-36 animate-pulse rounded-2xl bg-stone-200" />
      {/* Skeleton kartu event types */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200" />
      ))}
    </div>
  );
}
