// src/lib/server/auth/redirect.ts
//
// Sample / placeholder — edit to match your actual route list and structure.
// Four pieces live here on purpose: they all reason about the same
// "where should this person end up" question, just at different moments.

const LOGIN_PATH = "/login";
const DEFAULT_REDIRECT = "/";
const ADMIN_ROUTE = "/admin";
const CHANGE_PASSWORD_PATH = "/change-password";
// Neither of these is ever somewhere to land after signing in: both send
// people onward by themselves, so storing one as a target only bounces.
const AUTH_SCREENS = [LOGIN_PATH, CHANGE_PASSWORD_PATH];
// Default-protected model: only list the few routes that DON'T require a
// session. Every route not in this list is treated as private/protected.
// For this app, this list is probably short and stays short.
const PUBLIC_ROUTES = ["/login"];
// Only ever a base for parsing a relative redirect target — never requested.
// A target that resolves to any other origin is an off-site redirect.
const INTERNAL_ORIGIN = "http://internal.invalid";

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
  // Validated on the way out as well as on the way back in, so the login URL
  // never advertises a target that would only be thrown away later — such as
  // the change-password screen, which somebody can reach by typing it.
  const target = getSafeRedirectTarget(url.pathname + url.search, "");
  if (!target) return LOGIN_PATH;
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

  // Let the URL parser settle the rest. Anything that resolves away from this
  // origin — a stray backslash, a control character, an embedded scheme — comes
  // back under a different origin and is rejected. Parsing rather than string
  // matching also keeps a colon inside a query string legal, so a target like
  // /admin/fuel?from=2026-09-11T08:00 still survives.
  let parsed: URL;
  try {
    parsed = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }

  if (parsed.origin !== INTERNAL_ORIGIN) return fallback;

  // avoid bouncing back into the sign-in screens themselves
  if (AUTH_SCREENS.includes(parsed.pathname)) return fallback;

  return parsed.pathname + parsed.search + parsed.hash;
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

/**
 * PIECE 4 — login +page.server.ts action, for an account that still has to
 * change its password. That screen comes before anything else, so the page
 * the person was heading for cannot simply be honoured here; it rides along
 * in the query string and the change-password action finishes the journey.
 *
 * Returns a bare /change-password when there is no usable target.
 */
export function buildChangePasswordRedirect(target: string | null): string {
  const safe = getSafeRedirectTarget(target, "");
  if (!safe) return CHANGE_PASSWORD_PATH;
  return `${CHANGE_PASSWORD_PATH}?redirectTo=${encodeURIComponent(safe)}`;
}
