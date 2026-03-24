import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// ─── sitemap.ts ───────────────────────────────────────────────────────────────
// Sitemap dinamis yang diakses crawler di /sitemap.xml.
// Mencakup:
//   1. Halaman statis (landing, login, register)
//   2. Semua halaman profil publik host yang sudah onboarding
//   3. Semua event type aktif dari host yang sudah onboarding
//
// Catatan: dashboard, onboarding, dan API route tidak diindeks
// (sudah di-block di robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://janjilink.com";

  // ── Halaman statis ─────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                  lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/register`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // ── Profil publik semua host aktif ─────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: true,
      eventTypes: { some: { isActive: true } },
    },
    select: { slug: true, updatedAt: true },
  });

  const profilePages: MetadataRoute.Sitemap = users.map((u) => ({
    url: `${base}/${u.slug}`,
    lastModified: u.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── Halaman booking per event type ─────────────────────────────────────────
  const eventTypes = await prisma.eventType.findMany({
    where: {
      isActive: true,
      user: { onboardingCompleted: true },
    },
    select: {
      id: true,
      updatedAt: true,
      user: { select: { slug: true } },
    },
  });

  const eventPages: MetadataRoute.Sitemap = eventTypes.map((et) => ({
    url: `${base}/${et.user.slug}/${et.id}`,
    lastModified: et.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...profilePages, ...eventPages];
}
