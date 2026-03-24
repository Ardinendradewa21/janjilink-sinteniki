import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { BookingCalendar } from "@/components/public/BookingCalendar";
import { EventStructuredData } from "@/components/seo/StructuredData";

type BookingPageProps = {
  // Next.js 16: params adalah Promise, wajib di-await sebelum dipakai
  params: Promise<{ username: string; eventTypeId: string }>;
};

// ─── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { username, eventTypeId } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  const user = await prisma.user.findFirst({
    where: { OR: [{ slug: username }, { email: { startsWith: `${username}@` } }] },
    select: { name: true },
  });

  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, user: { slug: username }, isActive: true },
    select: { title: true, description: true, duration: true },
  });

  if (!user || !eventType) return { title: "Halaman tidak ditemukan | JanjiLink" };

  const hostName   = user.name ?? username;
  const title      = `${eventType.title} — Booking dengan ${hostName} | JanjiLink`;
  const description = eventType.description
    ?? `Booking ${eventType.title} dengan ${hostName}. Durasi ${eventType.duration} menit. Pilih waktu yang cocok sekarang via JanjiLink.`;

  return {
    title,
    description,
    openGraph: { title, description, siteName: "JanjiLink", type: "website" },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `${base}/${username}/${eventTypeId}` },
  };
}

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
    <>
      <EventStructuredData
        title={eventType.title}
        description={eventType.description}
        hostName={user.name ?? username}
        slug={username}
        eventTypeId={eventType.id}
        locationType={eventType.locationType}
      />
      <main className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <BookingCalendar
            username={username}
            eventType={eventType}
            host={{ name: user.name, image: user.image }}
          />
        </div>
      </main>
    </>
  );
}
