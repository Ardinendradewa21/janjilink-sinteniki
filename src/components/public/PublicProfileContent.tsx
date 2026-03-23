"use client";

// ─── PublicProfileContent ─────────────────────────────────────────────────────
// Halaman profil publik host — tampilan yang dilihat tamu/klien saat membuka
// link /[username].
//
// Desain: mobile-first, terasa seperti app booking (mirip GoFood/Grab).
// Struktur:
//   1. Banner owner (jika host membuka halamannya sendiri)
//   2. Header cover: gradient brand + avatar besar + nama
//   3. Section "Pilih Layanan": kartu event yang bisa diklik
//   4. Footer: powered by JanjiLink
//
// Animasi: Framer Motion stagger — elemen muncul berurutan dari bawah.

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock3, Eye, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  bio: string | null;
  eventTypes: PublicEventType[];
};

type PublicProfileContentProps = {
  username: string;
  user: PublicUser;
  isOwner?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "JL";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// ─── Animasi ─────────────────────────────────────────────────────────────────

// Container dengan efek stagger — anak-anaknya muncul berurutan
const stagger = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// Setiap kartu slide dari bawah saat pertama kali muncul
const slideUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// ─── EventCard ───────────────────────────────────────────────────────────────
// Kartu individual event type di profil publik.
// Desain app-like: info one-glance + tombol "Pilih" yang jelas.
function EventCard({ event, username }: { event: PublicEventType; username: string }) {
  const isOnline = event.locationType === "ONLINE";

  return (
    <motion.div variants={slideUp}>
      <Link
        href={`/${username}/${event.id}`}
        className="tap-scale group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
      >
        {/* Ikon kategori lokasi (online/offline) */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isOnline ? "bg-emerald-100" : "bg-lime-100"
          }`}
        >
          {isOnline ? (
            <Video className="h-5 w-5 text-emerald-600" />
          ) : (
            <MapPin className="h-5 w-5 text-lime-700" />
          )}
        </div>

        {/* Konten: nama, deskripsi, badge */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight text-stone-900 group-hover:text-emerald-700">
            {event.title}
          </p>
          {event.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">
              {event.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Badge durasi */}
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              <Clock3 className="h-3 w-3" />
              {event.duration} menit
            </span>
            {/* Badge online/offline */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isOnline ? "bg-emerald-100 text-emerald-700" : "bg-lime-100 text-lime-700"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Tombol panah — indikator bisa diklik */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 transition-colors group-hover:bg-emerald-600">
          <ArrowRight className="h-4 w-4 text-stone-500 transition-colors group-hover:text-white" />
        </div>
      </Link>
    </motion.div>
  );
}

// ─── PublicProfileContent ─────────────────────────────────────────────────────

export function PublicProfileContent({ username, user, isOwner }: PublicProfileContentProps) {
  const displayName = user.name ?? username;

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ─── Banner Owner ─────────────────────────────────────────────────────
          Muncul jika host membuka halamannya sendiri — beri tahu bahwa ini
          tampilan yang dilihat tamu, bukan halaman dashboard. */}
      {isOwner && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Ini tampilan publik yang dilihat tamumu.</span>
              <span className="sm:hidden">Tampilan publik</span>
            </div>
            <Link
              href="/dashboard"
              className="tap-scale flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">

        {/* ─── Header Profil Host ────────────────────────────────────────────
            Gradient latar sebagai "cover", avatar, nama.
            Dibuat seperti halaman profil app — bukan kartu biasa. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
        >
          {/* Cover gradient: warna brand emerald sebagai aksen visual */}
          <div className="h-20 bg-linear-to-br from-emerald-500 via-emerald-600 to-emerald-700" />

          {/* Avatar: menimpa cover dengan margin negatif */}
          <div className="px-5 pb-5">
            <div className="-mt-10 mb-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-emerald-100 text-2xl font-bold text-emerald-700">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>

            <h1 className="text-xl font-bold text-stone-900">{displayName}</h1>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              {user.bio ?? "Pilih jenis pertemuan di bawah dan tentukan waktu yang cocok untukmu."}
            </p>
          </div>
        </motion.div>

        {/* ─── Section Pilih Layanan ─────────────────────────────────────────
            Daftar event type yang bisa dipesan tamu.
            Animasi stagger: kartu muncul satu per satu. */}
        <div className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Pilih Layanan
          </p>

          {user.eventTypes.length === 0 ? (
            // Empty state: host belum punya event aktif
            <EmptyState
              icon={<Video className="h-10 w-10 text-stone-300" />}
              title="Belum ada layanan tersedia"
              description="Host belum menambahkan jadwal yang bisa dipesan. Coba cek kembali nanti."
            />
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {user.eventTypes.map((event) => (
                <EventCard key={event.id} event={event} username={username} />
              ))}
            </motion.div>
          )}
        </div>

        {/* ─── Footer ───────────────────────────────────────────────────────
            Atribusi JanjiLink — ditampilkan di semua halaman publik. */}
        <p className="mt-10 text-center text-xs text-stone-400">
          Dibuat dengan{" "}
          <Link href="/" className="font-medium text-emerald-600 hover:underline">
            JanjiLink
          </Link>
        </p>
      </main>
    </div>
  );
}
