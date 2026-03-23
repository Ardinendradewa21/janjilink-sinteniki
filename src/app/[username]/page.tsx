import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/session";
import { PublicProfileContent } from "@/components/public/PublicProfileContent";

type PublicProfilePageProps = {
  // Next.js 16: params adalah Promise, wajib di-await sebelum dipakai
  params: Promise<{ username: string }>;
};

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

  return <PublicProfileContent username={username} user={user} isOwner={isOwner} />;
}
