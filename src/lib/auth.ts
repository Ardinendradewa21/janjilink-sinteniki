import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

// Konfigurasi Auth.js v5 dengan Credentials (email + password) provider.
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, image: true, password: true },
        });

        // Tolak login jika user tidak ditemukan atau belum punya password
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Simpan id user ke JWT agar bisa diakses konsisten di server action/page.
    async jwt({ token, user }) {
      if (user?.id) {
        (token as { id?: string }).id = user.id;
      }
      return token;
    },
    // Inject user.id ke object session supaya tidak undefined di dashboard.
    async session({ session, token }) {
      if (session.user) {
        const userId = ((token as { id?: string }).id ?? token.sub) || undefined;
        (session.user as { id?: string }).id = userId;
      }
      return session;
    },
  },
});
