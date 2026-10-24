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

const PASSWORD_CHANGE_EXEMPT = ["/logout"];
const CHANGE_PASSWORD_ROUTE = "/change-password";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("session");

  if (!token) {
    clearAuthLocals(event);
    return guardOrResolve(event, resolve);
  }

  const { session, user, employee, permissions } =
    await validateSessionToken(token);

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

  // The person behind the login. Only the fields the app actually shows —
  // birth date, sex, civil status and the rest stay on the server.
  event.locals.user = {
    ...loggedInUser,
    employee: {
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
      positionTitle: employee.positionTitle,
      orgUnitFk: employee.orgUnitFk,
    },
  };
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
    const isExempt = PASSWORD_CHANGE_EXEMPT.includes(event.url.pathname);

    // must-change-password comes before every other page
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
      throw redirect(302, "/");
    }

    // Nobody is sent into or kept out of an area by address: each page's own
    // load checks the key it needs.
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
