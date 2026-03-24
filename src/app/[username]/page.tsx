import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/session";
import { PublicProfileContent } from "@/components/public/PublicProfileContent";
import { PersonStructuredData } from "@/components/seo/StructuredData";

type PublicProfilePageProps = {
  // Next.js 16: params adalah Promise, wajib di-await sebelum dipakai
  params: Promise<{ username: string }>;
};

// ─── generateMetadata ─────────────────────────────────────────────────────────
// Metadata dinamis per profil: title, description, Open Graph.
// Dipanggil server-side sebelum halaman di-render.
export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user.findFirst as any)({
    where: { OR: [{ slug: username }, { email: { startsWith: `${username}@` } }] },
    select: { name: true, image: true, bio: true },
  }) as { name: string | null; image: string | null; bio: string | null } | null;

  if (!user) return { title: "Profil tidak ditemukan | JanjiLink" };

  const displayName = user.name ?? username;
  const title       = `Booking dengan ${displayName} | JanjiLink`;
  const description = user.bio
    ?? `Atur jadwal bertemu dengan ${displayName} secara mudah. Pilih waktu yang cocok dan konfirmasi instan via JanjiLink.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "JanjiLink",
      ...(user.image ? { images: [{ url: user.image }] } : {}),
    },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `${base}/${username}` },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  // Jalankan kedua query secara paralel:
  //   1. Ambil data profil publik (selalu dibutuhkan)
  //   2. Cek siapa yang sedang login (opsional — untuk deteksi owner)
  // Menggunakan Promise.all agar tidak sequential.
  const [user, viewerUserId] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.user.findFirst as any)({
      where: {
        OR: [{ slug: username }, { email: { startsWith: `${username}@` } }],
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        eventTypes: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            locationType: true,
          },
        },
      },
    }) as Promise<{ id: string; name: string | null; image: string | null; bio: string | null; eventTypes: { id: string; title: string; description: string | null; duration: number; locationType: "ONLINE" | "OFFLINE" }[] } | null>,
    // getOptionalUserId tidak redirect jika belum login (berbeda dengan getRequiredUserId)
    // — cocok untuk halaman publik yang bisa diakses siapapun
    getOptionalUserId(),
  ]);

  // Halaman publik harus menampilkan 404 jika user tidak ditemukan.
  if (!user) notFound();

  // Deteksi apakah yang membuka halaman ini adalah pemilik profil tersebut.
  // Dipakai untuk menampilkan banner "Ini halaman publik Anda → Kembali ke Dashboard".
  const isOwner = viewerUserId === user.id;

  return (
    <>
      <PersonStructuredData
        name={user.name ?? username}
        slug={username}
        image={user.image}
        bio={user.bio}
      />
      <PublicProfileContent username={username} user={user} isOwner={isOwner} />
    </>
  );
}
