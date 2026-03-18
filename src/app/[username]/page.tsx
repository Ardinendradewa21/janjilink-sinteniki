import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PublicProfileContent } from "@/components/public/PublicProfileContent";

type PublicProfilePageProps = {
  // Next.js 16: params adalah Promise, wajib di-await sebelum dipakai
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  // Cari user berdasarkan slug atau prefix email agar kompatibel dengan akun OAuth.
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ slug: username }, { email: { startsWith: `${username}@` } }],
    },
    select: {
      name: true,
      image: true,
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
  });

  // Halaman public harus menampilkan 404 jika user tidak ditemukan.
  if (!user) {
    notFound();
  }

  return <PublicProfileContent username={username} user={user} />;
}
