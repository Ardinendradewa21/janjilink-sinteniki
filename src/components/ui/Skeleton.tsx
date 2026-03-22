// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Komponen loading placeholder — menampilkan kotak abu beranimasi pulse
// sebagai pengganti konten yang sedang dimuat.
//
// Dipakai di dalam komponen client untuk loading state granular
// (berbeda dari loading.tsx yang dipakai di level route).
//
// Cara pakai:
//   <Skeleton className="h-10 w-full rounded-xl" />
//   <Skeleton className="h-4 w-32 rounded-full" />

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  // animate-pulse: efek fade in-out berulang dari Tailwind
  // bg-stone-200: warna abu netral yang kontras di background stone-50
  return (
    <div
      className={`animate-pulse bg-stone-200 ${className}`}
      aria-hidden="true" // Sembunyikan dari screen reader karena bukan konten nyata
    />
  );
}

// ─── SkeletonText ─────────────────────────────────────────────────────────────
// Shortcut untuk skeleton teks satu baris — sudah preset rounded-full.
export function SkeletonText({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-4 rounded-full ${className}`} />;
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
// Shortcut untuk skeleton kartu — sudah preset rounded-2xl dan tinggi default.
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-36 rounded-2xl ${className}`} />;
}
