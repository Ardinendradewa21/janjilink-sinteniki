import type { MetadataRoute } from "next";

// ─── robots.ts ────────────────────────────────────────────────────────────────
// Memberi tahu crawler (Google, Bing, dll) halaman mana yang boleh/tidak
// diindeks. Diakses di /robots.txt secara otomatis oleh Next.js App Router.
//
// Aturan:
//   Boleh diindeks  : landing, profil publik, halaman booking
//   Tidak diindeks  : dashboard (privat), API routes, onboarding
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/dashboard", "/api/", "/onboarding", "/login", "/register"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
