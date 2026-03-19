"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock3, Eye, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicEventType = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  locationType: "ONLINE" | "OFFLINE";
};

type PublicUser = {
  name: string | null;
  image: string | null;
  eventTypes: PublicEventType[];
};

type PublicProfileContentProps = {
  username: string;
  user: PublicUser;
  // isOwner: true jika yang membuka halaman ini adalah pemilik profil.
  // Digunakan untuk menampilkan banner "Kembali ke Dashboard".
  isOwner?: boolean;
};

// Variants untuk animasi header (fade-in ringan).
const headerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// Variants container list dengan stagger.
const listVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// Variants item card untuk efek masuk bertahap.
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

function getInitials(name?: string | null) {
  if (!name) return "JL";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "JL";

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function PublicProfileContent({ username, user, isOwner }: PublicProfileContentProps) {
  const displayName = user.name ?? username;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ─── Banner Owner ──────────────────────────────────────────────────────
          Hanya muncul jika yang membuka halaman adalah pemilik profil.
          Memberi tahu host bahwa ini adalah tampilan publik yang dilihat tamu,
          sekaligus menyediakan jalan kembali ke dashboard. */}
      {isOwner && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Eye className="h-4 w-4 shrink-0" />
              <span>Ini adalah tampilan publik halamanmu — seperti yang dilihat oleh tamu.</span>
            </div>
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5
                         text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      )}

      <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <motion.section
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8"
        >
          <div className="mx-auto mb-4 flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.image ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-emerald-100 text-2xl font-semibold text-emerald-700">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{displayName}</h1>
          {/* Deskripsi dalam bahasa Indonesia sebagai teks default */}
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-stone-500">
            Pilih jenis pertemuan di bawah dan tentukan waktu yang paling cocok untukmu.
          </p>
        </motion.section>

        <motion.section
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4"
        >
          {user.eventTypes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold text-stone-900">Belum ada event aktif.</p>
              <p className="mt-2 text-stone-500">Silakan cek kembali nanti.</p>
            </div>
          ) : (
            user.eventTypes.map((eventType) => (
              <motion.div key={eventType.id} variants={itemVariants}>
                <Link href={`/${username}/${eventType.id}`} className="block">
                  <Card className="border-stone-200 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-xl text-stone-900">{eventType.title}</CardTitle>
                      <p className="leading-relaxed text-stone-500">
                        {eventType.description || "Pilih waktu terbaik Anda untuk bertemu."}
                      </p>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        <Clock3 className="h-4 w-4" />
                        {eventType.duration} menit
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                          eventType.locationType === "ONLINE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-lime-100 text-lime-700"
                        }`}
                      >
                        {eventType.locationType === "ONLINE" ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        {eventType.locationType === "ONLINE" ? "Online" : "Offline"}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </motion.section>
      </div>
      </main>
    </div>
  );
}
