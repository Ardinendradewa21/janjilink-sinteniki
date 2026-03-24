// ─── StructuredData.tsx ───────────────────────────────────────────────────────
// Komponen schema.org JSON-LD untuk AEO (Answer Engine Optimization) dan GEO
// (Generative Engine Optimization) agar konten JanjiLink bisa dijawab AI.
//
// Tiga jenis structured data:
//   WebsiteStructuredData — untuk halaman landing (WebApplication schema)
//   PersonStructuredData  — untuk halaman profil publik host
//   FAQStructuredData     — FAQ untuk landing page (AI snippet-able)

// ─── WebsiteStructuredData ────────────────────────────────────────────────────
// Memberitahu mesin pencari bahwa JanjiLink adalah aplikasi penjadwalan.
export function WebsiteStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "JanjiLink",
    url: "https://janjilink.com",
    description:
      "Platform penjadwalan meeting gratis untuk profesional, UMKM, dan organisasi Indonesia. Buat link booking, bagikan, dan terima janji temu tanpa ribet.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "id-ID",
    availableLanguage: "Indonesian",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
    },
    featureList: [
      "Booking meeting online dan offline",
      "Penjadwalan otomatis tanpa bolak-balik chat",
      "Notifikasi email dan WhatsApp",
      "Halaman profil publik dengan link unik",
      "Manajemen ketersediaan harian",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── PersonStructuredData ─────────────────────────────────────────────────────
// Untuk halaman profil publik host (/[username]).
// Membantu Google memahami bahwa halaman ini adalah profil seseorang.
export function PersonStructuredData({
  name,
  slug,
  image,
  bio,
}: {
  name: string;
  slug: string;
  image?: string | null;
  bio?: string | null;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `${base}/${slug}`,
    ...(image ? { image } : {}),
    ...(bio ? { description: bio } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── EventStructuredData ──────────────────────────────────────────────────────
// Untuk halaman booking event type (/[username]/[eventTypeId]).
// Memberi tahu mesin pencari tentang jenis event yang bisa dipesan.
export function EventStructuredData({
  title,
  description,
  hostName,
  slug,
  eventTypeId,
  locationType,
}: {
  title: string;
  description?: string | null;
  hostName: string;
  slug: string;
  eventTypeId: string;
  locationType: "ONLINE" | "OFFLINE";
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    ...(description ? { description } : {}),
    url: `${base}/${slug}/${eventTypeId}`,
    organizer: {
      "@type": "Person",
      name: hostName,
      url: `${base}/${slug}`,
    },
    eventAttendanceMode:
      locationType === "ONLINE"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── FAQStructuredData ────────────────────────────────────────────────────────
// FAQ schema untuk landing page.
// Membantu ChatGPT, Gemini, Perplexity menjawab pertanyaan tentang JanjiLink.
const FAQS = [
  {
    q: "Apa itu JanjiLink?",
    a: "JanjiLink adalah platform penjadwalan meeting gratis untuk siapa saja di Indonesia. Cukup buat link booking, bagikan, dan orang lain bisa langsung pilih waktu yang cocok — tanpa perlu bolak-balik chat.",
  },
  {
    q: "Apakah JanjiLink gratis?",
    a: "Ya, JanjiLink sepenuhnya gratis untuk digunakan. Buat akun, atur jadwal, dan terima booking tanpa biaya.",
  },
  {
    q: "Siapa yang bisa memakai JanjiLink?",
    a: "JanjiLink bisa dipakai oleh siapa saja: mahasiswa untuk jadwal bimbingan, dokter untuk antrian pasien, pemilik salon atau bengkel, panitia event, pengurus organisasi, HR untuk schedule interview, konsultan, fotografer, dan banyak lagi.",
  },
  {
    q: "Bagaimana cara kerja JanjiLink?",
    a: "Host membuat akun dan mengatur jam ketersediaan. Tamu membuka link unik host, memilih tanggal dan jam yang tersedia, mengisi nama dan kontak, lalu booking langsung terkonfirmasi. Host mendapat notifikasi email dan bisa konfirmasi atau batalkan.",
  },
  {
    q: "Apakah JanjiLink mendukung notifikasi WhatsApp?",
    a: "Ya, JanjiLink mendukung notifikasi via WhatsApp selain email. Host bisa memasukkan nomor WA untuk memudahkan tamu menghubungi langsung.",
  },
  {
    q: "Apakah JanjiLink bisa untuk meeting offline?",
    a: "Ya, JanjiLink mendukung dua mode: online (via Zoom, Google Meet, Jitsi) maupun offline (tatap muka). Host bisa menentukan lokasi dan tipe pertemuan saat membuat event.",
  },
];

export function FAQStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Export FAQS agar bisa dipakai di komponen UI (accordion FAQ di landing)
export { FAQS };
