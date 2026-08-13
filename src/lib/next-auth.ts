import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: false,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token }) {
      if (token.sub && token.region === undefined) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { region: true },
        });
        token.region = (user?.region ?? "id") as "id" | "intrl";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.region = (token.region ?? "id") as "id" | "intrl";
      }
      return session;
    },
  },
  logger: {
    error: (err) => console.error("[auth][error]", err),
    warn: (msg) => console.warn("[auth][warn]", msg),
  },
});