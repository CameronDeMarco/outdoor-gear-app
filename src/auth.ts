import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js configuration.
 *
 * We use the Credentials provider (email + password) with JWT-based sessions.
 * The password check happens in `authorize`: look up the user, compare the
 * submitted password against the stored bcrypt hash, and return the user (or
 * null to reject). Sessions are stateless JWTs signed with AUTH_SECRET.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return null;

        // Anything returned here is encoded into the JWT.
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Persist the user id onto the token when they first sign in...
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // ...then expose it on the session so server code can read session.user.id.
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
