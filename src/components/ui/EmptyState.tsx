// ─── EmptyState ───────────────────────────────────────────────────────────────
// Komponen reusable untuk menampilkan state kosong (tidak ada data).
//
// Prinsip dari JANJILINK_CONTEXT.md:
//   "Empty state SELALU punya call-to-action, JANGAN tampilkan halaman kosong."
//
// Cara pakai:
//   <EmptyState
//     icon={<CalendarX2 className="h-10 w-10 text-stone-300" />}
//     title="Belum ada booking"
//     description="Booking dari tamu akan muncul di sini."
//     action={{ label: "Salin link profil", onClick: handleCopy }}
//   />

import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyStateAction = {
  label: string;
  onClick?: () => void;   // gunakan ini untuk tombol biasa
  href?: string;          // gunakan ini untuk tombol yang navigasi ke halaman lain
};

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  // CTA opsional: jika tidak diisi, hanya tampil pesan tanpa tombol
  action?: EmptyStateAction;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center shadow-sm">
      {/* Ikon deskriptif — gunakan warna stone-300 agar tidak terlalu mencolok */}
      <div className="mb-4">{icon}</div>

      {/* Judul state kosong */}
      <p className="text-lg font-semibold text-stone-900">{title}</p>

      {/* Deskripsi pendek: apa yang terjadi + apa yang bisa dilakukan */}
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
        {description}
      </p>

      {/* CTA: tombol aksi utama ─────────────────────────────────────────────
          Jika ada href → render sebagai Link (navigasi halaman)
          Jika ada onClick → render sebagai Button biasa */}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
