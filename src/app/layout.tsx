import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Font global untuk seluruh halaman JanjiLink.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

// Metadata default — berlaku di semua halaman kecuali yang punya generateMetadata sendiri.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "JanjiLink — Jadwalkan Meeting Tanpa Ribet",
    template: "%s | JanjiLink",
  },
  description:
    "Platform penjadwalan meeting gratis untuk profesional, UMKM, dan organisasi Indonesia. Buat link booking unik, bagikan, dan terima janji temu tanpa bolak-balik chat.",
  keywords: [
    "jadwal meeting",
    "booking online",
    "penjadwalan otomatis",
    "scheduling Indonesia",
    "calendly indonesia",
    "janji temu",
    "booking gratis",
  ],
  openGraph: {
    siteName: "JanjiLink",
    type: "website",
    locale: "id_ID",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Terapkan font Inter + warna dasar aplikasi sesuai guideline UI. */}
      <body className={`${inter.variable} bg-stone-50 text-stone-900 antialiased`}>
        {children}
        {/* Toast notification global — muncul di pojok kanan atas. */}
        {/* Dipanggil via toast.success() / toast.error() dari komponen manapun. */}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
