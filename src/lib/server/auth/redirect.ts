// src/lib/server/auth/redirect.ts
//
// Sample / placeholder — edit to match your actual route list and structure.
// Three pieces live here on purpose: they all reason about the same
// "where should this person end up" question, just at different moments.

const LOGIN_PATH = "/login";
const DEFAULT_REDIRECT = "/";
const ADMIN_ROUTE = "/admin";
// Default-protected model: only list the few routes that DON'T require a
// session. Every route not in this list is treated as private/protected.
// For this app, this list is probably short and stays short.
const PUBLIC_ROUTES = ["/login"];

/**
 * Used inside hooks.server.ts to decide whether the current request
 * needs an authenticated session at all.
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

/**
 * PIECE 1 — hooks.server.ts, blocking an unauthenticated request.
 * Builds the login URL with a redirectTo param pointing back at the
 * page the user was actually trying to reach.
 */
export function buildLoginRedirect(url: URL): string {
  const target = url.pathname + url.search;
  return `${LOGIN_PATH}?redirectTo=${encodeURIComponent(target)}`;
}

/**
 * Decides where a logged-in user should land by default, based on
 * their permissions. Admin-capable users land on /admin; everyone
 * else lands on the default route. This is only ever a FALLBACK —
 * an explicit redirectTo (e.g. from being bounced off a protected
 * page) should still win over this when present.
 */
export function getDefaultLandingRoute(permissions: Set<string>): string {
  return permissions.has("admin:view") ? ADMIN_ROUTE : DEFAULT_REDIRECT;
}

/**
 * PIECE 2 — login +page.server.ts action, after a successful login.
 * Validates the redirectTo value before trusting it. Returns a safe
 * internal path, or the fallback if missing/malformed/off-site.
 */
export function getSafeRedirectTarget(
  value: string | null,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!value) return fallback;

  // must start with a single '/', not '//' (protocol-relative),
  // and not a backslash variant some browsers normalize to '//'
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback;
  }

  // reject anything with a scheme (http:, https:, javascript:, etc.)
  if (value.includes(":")) {
    return fallback;
  }

  // avoid bouncing back into the login page itself
  if (value.startsWith(LOGIN_PATH)) {
    return fallback;
  }

  return value;
}

/**
 * PIECE 3 — login +page.server.ts load function, on page visit.
 * If the visitor already has a valid session (e.g. hit /login via
 * back button, bfcache miss, reload, or a stale bookmark), send them
 * forward instead of showing the login form again.
 *
 * Returns null if the user is NOT logged in (caller should render
 * the login form as normal). Returns a redirect target string if
 * they ARE logged in (caller should redirect).
 * getAlreadyLoggedInRedirect now needs to accept the computed fallback
 * instead of always using DEFAULT_REDIRECT
 */
export function getAlreadyLoggedInRedirect(
  hasSession: boolean,
  redirectToParam: string | null,
  fallback: string = DEFAULT_REDIRECT,
): string | null {
  if (!hasSession) return null;
  return getSafeRedirectTarget(redirectToParam, fallback);
}
