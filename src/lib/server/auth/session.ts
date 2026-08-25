import { db } from "$lib/server/db";
import { expandPermissions } from "$lib/server/permissions";
import {
  employee,
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

function emptySession() {
  return {
    session: null,
    user: null,
    employee: null,
    permissions: new Set<string>(),
  };
}

export async function validateSessionToken(token: string) {
  const sessionPk = hashToken(token);

  // The employee join is inner, not left: user.employee_fk is NOT NULL, so a
  // login without a person cannot exist.
  const [row] = await db
    .select({ session, user, employee })
    .from(session)
    .innerJoin(user, eq(session.userFk, user.userPk))
    .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
    .where(eq(session.sessionPk, sessionPk));

  if (!row) return emptySession();

  if (Date.now() >= row.session.expiresAt.getTime()) {
    await db.delete(session).where(eq(session.sessionPk, sessionPk));
    return emptySession();
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

  // Expand into the implication closure: a role granted only
  // `admin:manage_org_units` effectively holds `admin:view_org_units` and
  // `admin:view` too. Roles saved through the UI are already stored expanded,
  // but doing it here as well covers rows written by scripts/create-admin.ts
  // and any role saved before the closure existed — no backfill needed.
  const permissions = expandPermissions(permRows.map((p) => p.key));

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
