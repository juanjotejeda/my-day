import { google } from "googleapis";

import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

/** The stored consent no longer works: Juan has to reconnect Google. */
export class GoogleDisconnected extends Error {}

export function isInvalidGrant(error: unknown): boolean {
  const e = error as { message?: string; response?: { data?: { error?: string } } };
  return e?.response?.data?.error === "invalid_grant" || Boolean(e?.message?.includes("invalid_grant"));
}

export function statusOf(error: unknown): number | undefined {
  const e = error as { code?: number | string; status?: number; response?: { status?: number } };
  const raw = e?.response?.status ?? e?.status ?? e?.code;
  return typeof raw === "string" ? Number(raw) || undefined : raw;
}

/** An OAuth2 client for Juan's Google account, refreshed from the encrypted refresh token. */
export async function googleAuth(userId: string) {
  const source = await prisma.source.findUnique({
    where: { userId_kind: { userId, kind: "google" } },
  });
  if (!source?.encryptedRefreshToken) {
    throw new GoogleDisconnected("no Google refresh token stored");
  }

  const auth = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
  auth.setCredentials({ refresh_token: decrypt(source.encryptedRefreshToken) });

  return { auth, source };
}

/** Record that the connection broke, so the app can show the Connection lost state. */
export async function markDisconnected(userId: string, message: string) {
  await prisma.source.updateMany({
    where: { userId, kind: "google" },
    data: { disconnectedAt: new Date(), lastError: message },
  });
}
