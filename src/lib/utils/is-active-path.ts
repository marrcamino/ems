function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Whether a nav link points at the page currently being viewed.
 *
 * The match is exact by design. Every route in the app is a plain route with
 * no child pages, so pathname equality covers every case; prefix or segment
 * matching would light a parent link up on pages that are not its own.
 * Trailing slashes are normalized first so "/fuel/" and "/fuel" agree, with
 * the root path left alone because stripping its slash leaves nothing.
 */
export function isActivePath(pathname: string, href: string): boolean {
  return stripTrailingSlash(pathname) === stripTrailingSlash(href);
}
