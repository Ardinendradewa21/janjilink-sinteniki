import { PrismaClient } from "@prisma/client";

// Menyimpan instance Prisma di global saat development agar tidak membuat koneksi baru berulang kali.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Membuat instance Prisma untuk dipakai query database di server.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log query/error dibuat lebih detail saat development untuk memudahkan debugging.
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

// Menyimpan instance ke global agar hot-reload Next.js tidak membuat banyak koneksi.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Default export untuk memudahkan import di konfigurasi auth.
export default prisma;
