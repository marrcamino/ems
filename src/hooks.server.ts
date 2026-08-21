// hooks.server.ts
import {
  deleteSessionTokenCookie,
  setSessionTokenCookie,
  validateSessionToken,
} from "$lib/server/auth/session";
import { buildLoginRedirect, isPublicRoute } from "@/server/auth/redirect";
import {
  redirect,
  type Handle,
  type HandleServerError,
} from "@sveltejs/kit";

const ADMIN_ROUTE_PREFIX = "/admin";
const ROLE_ROUTING_EXEMPT = ["/logout"];
const CHANGE_PASSWORD_ROUTE = "/change-password";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("session");

  if (!token) {
    clearAuthLocals(event);
    return guardOrResolve(event, resolve);
  }

  const { session, user, permissions } = await validateSessionToken(token);

  if (!session && !user) {
    deleteSessionTokenCookie(event);
    clearAuthLocals(event);

    return guardOrResolve(event, resolve);
  }

  setSessionTokenCookie(event, token, session.expiresAt);

  event.locals.session = {
    sessionPk: session.sessionPk,
    expiresAt: session.expiresAt,
  };

  const {
    passwordHash,
    failedLoginAttempts,
    lockedUntil,
    lastLoginAt,
    createdByFk,
    createdAt,
    updatedAt,
    ...loggedInUser
  } = user;

  event.locals.user = loggedInUser;
  event.locals.permissions = permissions;

  return guardOrResolve(event, resolve);
};

function guardOrResolve(
  event: Parameters<Handle>[0]["event"],
  resolve: Parameters<Handle>[0]["resolve"],
) {
  if (!event.locals.user && !isPublicRoute(event.url.pathname)) {
    throw redirect(302, buildLoginRedirect(event.url));
  }

  const routeExists = event.route.id !== null;

  if (event.locals.user && routeExists) {
    const isChangePasswordRoute = event.url.pathname === CHANGE_PASSWORD_ROUTE;
    const isExempt = ROLE_ROUTING_EXEMPT.includes(event.url.pathname);

    // must-change-password takes priority over the admin-area guard —
    // an admin with this flag still gets sent here, not to /admin
    if (
      event.locals.user.mustChangePassword &&
      !isChangePasswordRoute &&
      !isExempt
    ) {
      throw redirect(302, CHANGE_PASSWORD_ROUTE);
    }

    // the inverse: don't let someone who does NOT need to change their
    // password sit on /change-password indefinitely (e.g. via back button)
    if (!event.locals.user.mustChangePassword && isChangePasswordRoute) {
      const isAdmin = event.locals.permissions.has("admin:view");
      throw redirect(302, isAdmin ? ADMIN_ROUTE_PREFIX : "/");
    }

    if (!isExempt && !isChangePasswordRoute) {
      const isAdmin = event.locals.permissions.has("admin:view");
      const inAdminArea = event.url.pathname.startsWith(ADMIN_ROUTE_PREFIX);

      if (isAdmin && !inAdminArea) {
        throw redirect(302, ADMIN_ROUTE_PREFIX);
      }

      if (!isAdmin && inAdminArea) {
        throw redirect(302, "/");
      }
    }
  }

  return resolve(event);
}

function clearAuthLocals(event: Parameters<Handle>[0]["event"]) {
  event.locals.user = null;
  event.locals.session = null;
  event.locals.permissions = new Set();
}

// Unexpected errors reach the client as a generic message; log the real one
// against a short id that the error page shows under "Error details".
export const handleError: HandleServerError = ({ error, status, message }) => {
  if (status === 404) return { message };

  const errorId = `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  console.error(`[${errorId}]`, error);

  return { message, errorId };
};
