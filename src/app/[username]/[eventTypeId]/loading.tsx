// ─── Loading skeleton untuk halaman booking kalender ─────────────────────────
export default function BookingPageLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      {/* Skeleton info host */}
      <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
      {/* Skeleton step indicator */}
      <div className="mx-auto h-6 w-48 animate-pulse rounded-full bg-stone-200" />
      {/* Skeleton kalender */}
      <div className="h-80 animate-pulse rounded-2xl bg-stone-200" />
    </div>
  );
}
