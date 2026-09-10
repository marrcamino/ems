function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Whether a nav link points at the page currently being viewed.
 *
 * The match is exact by design. Where one route sits under another — Asset
 * Types under Assets — both carry their own nav link, so an exact match still
 * lights exactly one of them; prefix or segment matching would light the
 * parent up as well, on a page that is not its own.
 * Trailing slashes are normalized first so "/fuel/" and "/fuel" agree, with
 * the root path left alone because stripping its slash leaves nothing.
 */
export function isActivePath(pathname: string, href: string): boolean {
  return stripTrailingSlash(pathname) === stripTrailingSlash(href);
}
