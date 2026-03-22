// ─── Loading skeleton untuk halaman pengaturan ───────────────────────────────
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
      <div className="max-w-lg space-y-4 rounded-xl bg-stone-200 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-300" />
        ))}
      </div>
    </div>
  );
}
