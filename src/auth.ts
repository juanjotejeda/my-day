import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      authorization: {
        params: {
          scope: SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: true,
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return false;

      const user = await prisma.user.upsert({
        where: { email },
        update: { name: profile?.name ?? undefined },
        create: { email, name: profile?.name ?? undefined },
      });

      // Google only returns a refresh token on consent; keep the stored one otherwise.
      const refreshToken = account?.refresh_token
        ? encrypt(account.refresh_token)
        : undefined;

      await prisma.source.upsert({
        where: { userId_kind: { userId: user.id, kind: "google" } },
        update: {
          encryptedRefreshToken: refreshToken,
          scopes: account?.scope?.split(" ") ?? SCOPES,
          lastError: null,
          disconnectedAt: null,
        },
        create: {
          userId: user.id,
          kind: "google",
          encryptedRefreshToken: refreshToken,
          scopes: account?.scope?.split(" ") ?? SCOPES,
        },
      });

      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
  },
});
