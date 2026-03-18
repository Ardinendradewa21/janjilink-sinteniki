import { redirect } from "next/navigation";
import { CreateEventDialog } from "@/components/dashboard/CreateEventDialog";
import { CopyLinkButton } from "@/components/dashboard/CopyLinkButton";
import { EventTypeCard } from "@/components/dashboard/EventTypeCard";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── DashboardHomePage ───────────────────────────────────────────────────────
// Halaman utama dashboard host.
// Menampilkan: sambutan, URL publik (My Link), tombol buat event, daftar event types.
// Route: /dashboard
export default async function DashboardHomePage() {
  // Pastikan user sudah login
  const session = await auth();
  if (!session) redirect("/");

  // Ambil userId dari session (dengan fallback email lookup)
  let userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId && session.user?.email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = userByEmail?.id;
  }

  if (!userId) {
    return (
      <section className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-medium leading-relaxed text-amber-700">
            Session tidak valid. Silakan login ulang untuk melanjutkan.
          </p>
        </div>
      </section>
    );
  }

  // Ambil semua event type milik user ini, urutkan dari terbaru
  const eventTypes = await prisma.eventType.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Ambil slug nyata dari DB agar URL publik akurat (bukan cuid default)
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { slug: true },
  });

  const publicSlug = userRecord?.slug ?? session.user?.email?.split("@")[0] ?? "user";
  const firstName = session?.user?.name?.split(" ")[0] ?? "Host";

  return (
    <section className="space-y-6">
      {/* Sambutan user */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium leading-relaxed text-stone-500">Selamat datang, {firstName}!</p>
        <p className="mt-1 text-xl font-semibold text-stone-900">Kelola jadwal meeting kamu dari satu dashboard.</p>
      </div>

      {/* Baris atas: URL publik (My Link) + tombol buat event baru */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">My Link</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm font-semibold text-stone-900 sm:text-base">
              janjilink.com/{publicSlug}
            </p>
            {/* Tombol copy link — client component dengan toast notification */}
            <CopyLinkButton slug={publicSlug} />
          </div>
        </div>

        {/* Dialog untuk membuat event type baru */}
        <CreateEventDialog />
      </div>

      {/* Daftar event type dalam grid responsif */}
      {eventTypes.length === 0 ? (
        // Empty state: tampilkan pesan ajakan membuat event pertama
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-stone-900">Belum ada jadwal.</p>
          <p className="mt-2 leading-relaxed text-stone-500">Buat event pertama Anda!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventTypes.map((eventType) => (
            <EventTypeCard
              key={eventType.id}
              id={eventType.id}
              title={eventType.title}
              description={eventType.description}
              duration={eventType.duration}
              locationType={eventType.locationType}
              // Data tambahan untuk dialog Edit Event
              platform={eventType.platform}
              locationDetails={eventType.locationDetails}
              isActive={eventType.isActive}
              username={publicSlug}
            />
          ))}
        </div>
      )}
    </section>
  );
}
