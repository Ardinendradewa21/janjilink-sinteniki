import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AvailabilityForm } from "@/components/dashboard/AvailabilityForm";

// ─── Default availability ────────────────────────────────────────────────────
// Ketersediaan bawaan jika user belum pernah menyimpan pengaturan.
// Senin–Sabtu: 09:00–17:00. Minggu: tidak tersedia.
const DEFAULT_DAYS = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isActive: i >= 1 && i <= 6, // 1=Senin sampai 6=Sabtu aktif, 0=Minggu nonaktif
  startTime: "09:00",
  endTime: "17:00",
}));

// ─── AvailabilityPage ────────────────────────────────────────────────────────
// Halaman server component untuk mengatur ketersediaan per hari.
// Mengambil data availability dari database, fallback ke default jika belum ada.
// Route: /dashboard/availability
export default async function AvailabilityPage() {
  // Pastikan user sudah login
  const session = await auth();
  if (!session) redirect("/");

  // Ambil userId dari session (dengan fallback email lookup)
  let userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId && session.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }
  if (!userId) redirect("/");

  // Ambil data ketersediaan dari database, urutkan per hari (0=Minggu ... 6=Sabtu)
  const availabilities = await prisma.availability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: "asc" },
    select: { dayOfWeek: true, isActive: true, startTime: true, endTime: true },
  });

  // Jika user belum pernah mengatur, gunakan default
  // Jika sudah ada data di DB, gunakan data tersebut
  const days =
    availabilities.length === 7
      ? availabilities.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          isActive: a.isActive,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      : DEFAULT_DAYS;

  return (
    <section className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Ketersediaan</p>
        <p className="mt-1 text-sm text-stone-500">
          Atur jam kerja Anda per hari. Slot booking yang tersedia akan mengikuti pengaturan ini.
        </p>
      </div>

      {/* Card form ketersediaan */}
      <div className="max-w-2xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <AvailabilityForm initialDays={days} />
      </div>
    </section>
  );
}
