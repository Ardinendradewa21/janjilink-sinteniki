// ─── Dashboard Home ───────────────────────────────────────────────────────────
// Halaman utama dashboard host.
// Route: /dashboard
//
// Menampilkan: sambutan, My Link (URL publik), tombol buat event, daftar event types.
// Data di-fetch via getDashboardData() dari query layer — halaman ini murni rendering.

import { getRequiredUserId } from "@/lib/session";
import { getDashboardData } from "@/server/queries/dashboard";
import { CreateEventDialog } from "@/components/dashboard/CreateEventDialog";
import { CopyLinkButton } from "@/components/dashboard/CopyLinkButton";
import { EventTypeCard } from "@/components/dashboard/EventTypeCard";
import { auth } from "@/lib/auth";
import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DashboardHomePage() {
  const userId = await getRequiredUserId();

  // Ambil event types + slug dalam satu panggilan (dua query paralel di dalam)
  const { eventTypes, slug } = await getDashboardData(userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Nama depan untuk sapaan — ambil dari session (tidak perlu query DB lagi)
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Host";

  return (
    <section className="space-y-6">
      {/* Sapaan user */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium leading-relaxed text-stone-500">
          Selamat datang, {firstName}!
        </p>
        <p className="mt-1 text-xl font-semibold text-stone-900">
          Kelola jadwal meeting kamu dari satu dashboard.
        </p>
      </div>

      {/* My Link + tombol buat event baru */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            My Link
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm font-semibold text-stone-900 sm:text-base">
              janjilink.com/{slug}
            </p>
            {/* CopyLinkButton: client component, copy ke clipboard + toast */}
            <CopyLinkButton slug={slug} />
          </div>
        </div>

        {/* Dialog buat event type baru */}
        <CreateEventDialog />
      </div>

      {/* Grid event types */}
      {eventTypes.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-10 w-10 text-stone-300" />}
          title="Belum ada jadwal"
          description="Buat event pertama kamu agar tamu bisa langsung booking waktu bersamamu."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventTypes.map((et) => (
            <EventTypeCard
              key={et.id}
              id={et.id}
              title={et.title}
              description={et.description}
              duration={et.duration}
              locationType={et.locationType}
              platform={et.platform}
              locationDetails={et.locationDetails}
              isActive={et.isActive}
              username={slug}
              appUrl={appUrl}
            />
          ))}
        </div>
      )}
    </section>
  );
}
