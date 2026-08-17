import { db } from "$lib/server/db";
import {
  permission,
  rolePermission,
  session,
  user,
} from "$lib/server/db/schema";
import type { RequestEvent } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8h — adjust for office hours
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 2;

export function generateSessionToken(): string {
  // 20 random bytes, base64url-encoded — URL/cookie-safe, no padding chars
  return randomBytes(20).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(token: string, userId: number) {
  const sessionPk = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(session).values({ sessionPk, userFk: userId, expiresAt });
  return { sessionPk, expiresAt };
}

export async function validateSessionToken(token: string) {
  const sessionPk = hashToken(token);

  const [row] = await db
    .select({ session, user })
    .from(session)
    .innerJoin(user, eq(session.userFk, user.userPk))
    .where(eq(session.sessionPk, sessionPk));

  if (!row)
    return { session: null, user: null, permissions: new Set<string>() };

  if (Date.now() >= row.session.expiresAt.getTime()) {
    await db.delete(session).where(eq(session.sessionPk, sessionPk));
    return { session: null, user: null, permissions: new Set<string>() };
  }

  if (Date.now() >= row.session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db
      .update(session)
      .set({ expiresAt: newExpiresAt })
      .where(eq(session.sessionPk, sessionPk));
    row.session.expiresAt = newExpiresAt;
  }

  const permRows = await db
    .select({ key: permission.key })
    .from(rolePermission)
    .innerJoin(
      permission,
      eq(rolePermission.permissionFk, permission.permissionPk),
    )
    .where(eq(rolePermission.roleFk, row.user.roleFk));

  const permissions = new Set(permRows.map((p) => p.key));

  return { ...row, permissions };
}

export async function invalidateSession(sessionPk: string) {
  await db.delete(session).where(eq(session.sessionPk, sessionPk));
}

export function setSessionTokenCookie(
  event: RequestEvent,
  token: string,
  expiresAt: Date,
) {
  event.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // LAN-only, no HTTPS — flip to true if terminate TLS
    expires: expiresAt,
    path: "/",
  });
}

export function deleteSessionTokenCookie(event: RequestEvent) {
  event.cookies.delete("session", { path: "/" });
}
