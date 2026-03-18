import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Font global untuk seluruh halaman JanjiLink.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Metadata default aplikasi (judul dan deskripsi SEO).
export const metadata: Metadata = {
  title: "JanjiLink - Smart Scheduling",
  description: "Atur jadwal meeting online & offline tanpa ribet.",
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
