// ─── DashboardBookingsPage ────────────────────────────────────────────────────
// Daftar semua booking milik host dengan filter tab status.
// Route: /dashboard/bookings
//
// Pola arsitektur:
//  - Halaman ini (server component) hanya fetch data + render header
//  - BookingFilterTabs (client component) menangani filter + render kartu

import { getRequiredUserId } from "@/lib/session";
import { getBookingsForUser } from "@/server/queries/bookings";
import { BookingFilterTabs } from "@/components/dashboard/BookingFilterTabs";

export default async function DashboardBookingsPage() {
  const userId = await getRequiredUserId();
  const bookings = await getBookingsForUser(userId);

  const now = new Date();
  const upcomingCount = bookings.filter((b) => b.startTime >= now).length;
  const pastCount     = bookings.filter((b) => b.startTime <  now).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Semua Booking</p>
        <p className="mt-1 text-sm text-stone-500">
          {upcomingCount} mendatang · {pastCount} selesai
        </p>
      </div>

      {/* Filter tabs + daftar booking */}
      <BookingFilterTabs bookings={bookings} />
    </section>
  );
}
