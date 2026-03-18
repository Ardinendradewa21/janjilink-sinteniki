import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { BookingCalendar } from "@/components/public/BookingCalendar";

type BookingPageProps = {
  // Next.js 16: params adalah Promise, wajib di-await sebelum dipakai
  params: Promise<{ username: string; eventTypeId: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { username, eventTypeId } = await params;

  // Cari user berdasarkan slug atau prefix email
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ slug: username }, { email: { startsWith: `${username}@` } }],
    },
    select: {
      id: true,
      name: true,
      image: true,
    },
  });

  if (!user) notFound();

  // Ambil detail event type yang diminta, pastikan masih aktif dan milik user ini
  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId: user.id, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      duration: true,
      locationType: true,
      platform: true,
      locationDetails: true,
    },
  });

  if (!eventType) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <BookingCalendar
          username={username}
          eventType={eventType}
          host={{ name: user.name, image: user.image }}
        />
      </div>
    </main>
  );
}
