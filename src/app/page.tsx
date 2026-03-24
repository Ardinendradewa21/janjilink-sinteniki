"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Link2,
  ListTodo,
  MapPin,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FAQStructuredData,
  FAQS,
  WebsiteStructuredData,
} from "@/components/seo/StructuredData";

// ─── Konstanta animasi ────────────────────────────────────────────────────────
// Dipakai berulang di seluruh halaman agar transisi masuk konsisten.

// Container yang menjalankan animasi anak-anak secara bergiliran (stagger)
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

// Setiap elemen anak: muncul dari bawah ke atas dengan fade in
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ─── Data: Langkah "Cara Kerja" ───────────────────────────────────────────────
// Tiga langkah yang menjelaskan alur pemakaian JanjiLink secara linear.
// Ditampilkan di section HowItWorks.
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Buat event & bagikan link",
    description:
      "Tentukan jenis meeting, durasi, dan lokasi. Dapatkan link unik seperti janjilink.com/nama-kamu yang siap dibagikan ke klien.",
    icon: Link2,
  },
  {
    step: "02",
    title: "Klien pilih waktu sendiri",
    description:
      "Tamu buka link Anda, pilih tanggal dan jam yang kosong di kalender, isi nama & kontak — selesai. Tanpa perlu akun.",
    icon: CalendarCheck,
  },
  {
    step: "03",
    title: "Meeting terjadi, semua tercatat",
    description:
      "Setelah meeting, tulis catatan dan action items langsung dari dashboard. Tidak ada yang terlewat, tidak ada yang lupa.",
    icon: FileText,
  },
];

// ─── Data: Untuk Siapa ────────────────────────────────────────────────────────
// Tiga segmen target user dengan masalah spesifik mereka masing-masing.
// Setiap card menunjukkan masalah → solusi yang sangat konkret.
const FOR_WHO = [
  {
    icon: Users,
    title: "Freelancer & Konsultan",
    pain: "Jadwal berceceran di WA, catatan di HP, follow-up sering lupa.",
    solution: "Satu link booking, satu tempat catatan, satu daftar task dari setiap meeting.",
    examples: ["Desainer", "Coach", "Konsultan", "Tutor"],
  },
  {
    icon: CalendarCheck,
    title: "Tim Kecil & Agensi",
    pain: "Susah koordinasi jadwal antar anggota. Klien tanya siapa yang available?",
    solution: "Setiap anggota punya link booking sendiri. Calendar bersama tim dalam satu workspace.",
    examples: ["Agensi digital", "Startup early-stage", "Tim product"],
  },
  {
    icon: ListTodo,
    title: "Sales & Account Manager",
    pain: "Banyak meeting klien, action items dari setiap meeting terpencar-pencar.",
    solution: "Setiap booking jadi meeting dengan catatannya. Action items otomatis terhubung ke pertemuan asalnya.",
    examples: ["Account manager", "Business development", "Customer success"],
  },
];

// ─── Data: Keunggulan fitur ───────────────────────────────────────────────────
// Poin-poin singkat yang membedakan JanjiLink dari sekadar Calendly.
const FEATURES = [
  { icon: Clock3, text: "Booking online & offline dalam satu platform" },
  { icon: Video, text: "Integrasi Google Meet, Zoom, dan Jitsi" },
  { icon: MapPin, text: "Cari lokasi meeting dengan OpenStreetMap" },
  { icon: FileText, text: "Catatan meeting langsung dari dashboard" },
  { icon: ListTodo, text: "Action items terhubung ke setiap meeting" },
  { icon: CheckCircle2, text: "Konfirmasi dan batalkan booking dengan mudah" },
];

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">

      {/* ─── NAVBAR ──────────────────────────────────────────────────────────
          Sticky di atas dengan efek blur agar konten di bawahnya tetap terbaca
          saat di-scroll. Berisi logo + tombol masuk/daftar. */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            JanjiLink
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-stone-600 hover:text-stone-900">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button
              asChild
              className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
            >
              <Link href="/register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Structured data untuk mesin pencari dan AI (tidak terlihat di UI) */}
      <WebsiteStructuredData />
      <FAQStructuredData />

      <main>
        {/* ─── HERO SECTION ────────────────────────────────────────────────
            Bagian paling atas halaman. Tujuannya: dalam 5 detik,
            pengunjung harus paham masalah apa yang diselesaikan dan untuk siapa.
            Gunakan animasi stagger agar elemen muncul berurutan, bukan sekaligus. */}
        <section className="relative overflow-hidden">
          {/* Ornamen latar: gradient blur sebagai aksen visual, tidak mengganggu konten */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-72 w-200 -translate-x-1/2 rounded-full bg-linear-to-r from-emerald-200/50 via-lime-100/40 to-stone-200/50 blur-3xl" />
          </div>

          <motion.div
            className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Badge kecil di atas headline */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Platform scheduling untuk profesional Indonesia
            </motion.div>

            {/* ─── HEADLINE utama ─────────────────────────────────────────────
                Fokus ke MASALAH, bukan fitur.
                "Dari jadwalkan → sampai task selesai" = nilai utama workspace. */}
            <motion.h1
              variants={fadeUp}
              className="mt-5 max-w-4xl text-balance text-4xl font-bold leading-tight text-stone-900 sm:text-5xl lg:text-6xl"
            >
              Dari{" "}
              <span className="text-emerald-600">
                &ldquo;Kapan Kita Meeting?&rdquo;
              </span>{" "}
              Sampai{" "}
              <span className="text-emerald-600">
                Task Selesai
              </span>{" "}
              — Dalam Satu Tempat.
            </motion.h1>

            {/* Sub-headline: perjelas siapa yang butuh dan manfaatnya */}
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-500 sm:text-xl"
            >
              JanjiLink membantu freelancer, konsultan, dan tim kecil mengatur
              jadwal meeting, mencatat hasil diskusi, dan menindaklanjuti
              action items — semuanya dari satu dashboard.
            </motion.p>

            {/* CTA utama + CTA sekunder */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Link href="/register">
                  Mulai Gratis Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-lg border-stone-200 px-6 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                <Link href="/login">Sudah punya akun</Link>
              </Button>
            </motion.div>

            {/* Social proof ringan: tanpa database user, pakai teks saja dulu */}
            <motion.p
              variants={fadeUp}
              className="mt-5 text-sm text-stone-400"
            >
              Gratis untuk memulai · Tidak perlu kartu kredit
            </motion.p>
          </motion.div>
        </section>

        {/* ─── HOW IT WORKS ────────────────────────────────────────────────
            Tiga langkah visual yang menjelaskan alur kerja produk secara linear.
            Animasi hanya berjalan saat section masuk viewport (whileInView). */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {/* Label section */}
              <motion.p
                variants={fadeUp}
                className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600"
              >
                Cara Kerja
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="mt-3 text-center text-2xl font-bold text-stone-900 sm:text-3xl"
              >
                Tiga langkah yang mengubah cara Anda bekerja
              </motion.h2>

              {/* Grid tiga kartu langkah */}
              <div className="mt-12 grid gap-8 md:grid-cols-3">
                {HOW_IT_WORKS.map((item) => (
                  <motion.div
                    key={item.step}
                    variants={fadeUp}
                    className="relative"
                  >
                    {/* Nomor langkah besar sebagai aksen dekoratif */}
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                      <item.icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    {/* Nomor kecil di sudut kanan atas */}
                    <span className="absolute right-0 top-0 text-4xl font-bold text-stone-100">
                      {item.step}
                    </span>
                    <h3 className="text-lg font-semibold text-stone-900">{item.title}</h3>
                    <p className="mt-2 leading-relaxed text-stone-500">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── FOR WHO ─────────────────────────────────────────────────────
            Tiga card segmen target user. Setiap card:
            - Pain point (masalah nyata yang dialami)
            - Solution (apa yang JanjiLink selesaikan)
            - Contoh profesi
            Ini penting agar pengunjung langsung merasa "ini untuk saya". */}
        <section className="bg-stone-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.p
                variants={fadeUp}
                className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600"
              >
                Untuk Siapa
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="mt-3 text-center text-2xl font-bold text-stone-900 sm:text-3xl"
              >
                Dirancang untuk yang meeting-nya banyak
              </motion.h2>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {FOR_WHO.map((segment) => (
                  <motion.div
                    key={segment.title}
                    variants={fadeUp}
                    className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                  >
                    {/* Ikon segmen */}
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                      <segment.icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900">{segment.title}</h3>

                    {/* Pain point: masalah yang dialami sebelum pakai JanjiLink */}
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-red-600">Masalah selama ini:</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-red-700">
                        {segment.pain}
                      </p>
                    </div>

                    {/* Solution: apa yang berubah dengan JanjiLink */}
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-emerald-600">Dengan JanjiLink:</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-emerald-800">
                        {segment.solution}
                      </p>
                    </div>

                    {/* Tag contoh profesi */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {segment.examples.map((ex) => (
                        <span
                          key={ex}
                          className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── FEATURE CHECKLIST ───────────────────────────────────────────
            Daftar fitur ringkas dalam format grid.
            Sengaja simple — bukan untuk menjelaskan teknis,
            tapi untuk meyakinkan bahwa semua kebutuhan sudah ada. */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.h2
                variants={fadeUp}
                className="text-center text-2xl font-bold text-stone-900 sm:text-3xl"
              >
                Semua yang Anda butuhkan, sudah ada
              </motion.h2>

              {/* Grid checklist fitur — 2 kolom di mobile, 3 di desktop */}
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature) => (
                  <motion.div
                    key={feature.text}
                    variants={fadeUp}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5"
                  >
                    <div className="shrink-0 rounded-lg bg-emerald-100 p-1.5">
                      <feature.icon className="h-4 w-4 text-emerald-700" />
                    </div>
                    <span className="text-sm font-medium text-stone-700">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────────────────────
            Accordion FAQ: terlihat oleh user DAN diindeks AI mesin pencari.
            Menggunakan <details>/<summary> native — tanpa JS tambahan. */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              <motion.h2
                variants={fadeUp}
                className="text-center text-2xl font-bold text-stone-900 sm:text-3xl"
              >
                Pertanyaan yang sering ditanya
              </motion.h2>
              <motion.div variants={fadeUp} className="mt-8 space-y-3">
                {FAQS.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-stone-200 bg-stone-50 open:bg-white"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                      <span className="font-medium text-stone-900">{faq.q}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-stone-600">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── CTA FINAL ───────────────────────────────────────────────────
            Ajakan terakhir sebelum footer. Desain bold dan kontras
            agar user yang sudah scroll sampai sini terpancing klik. */}
        <section className="bg-stone-900">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <motion.div
              className="text-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
            >
              <motion.h2
                variants={fadeUp}
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                Siap akhiri kekacauan jadwal meeting?
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-3 text-stone-400"
              >
                Mulai gratis. Setup kurang dari 5 menit.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 rounded-lg bg-emerald-500 px-8 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  <Link href="/register">
                    Buat Akun Gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────
          Minimalis — hanya copyright dan link penting.
          Footer besar dengan banyak link tidak relevan saat produk masih early. */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-stone-900">JanjiLink</p>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} JanjiLink. Dibuat dengan ❤️ untuk profesional Indonesia.
          </p>
          <div className="flex gap-4 text-xs text-stone-400">
            <Link href="/login" className="hover:text-stone-700">Masuk</Link>
            <Link href="/register" className="hover:text-stone-700">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
