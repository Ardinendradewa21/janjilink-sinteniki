import { handlers } from "@/lib/auth";

// Mengekspos route GET/POST bawaan NextAuth di /api/auth/*.
export const { GET, POST } = handlers;
