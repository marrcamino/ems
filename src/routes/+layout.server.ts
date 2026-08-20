import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ url }) => {
  // Force a real server round-trip on every client-side navigation.
  // `locals` (session/user/permissions) isn't a tracked SvelteKit dependency,
  // so without reading something from `url` here, SvelteKit would reuse this
  // load's result on navigation instead of re-running hooks.server.ts —
  // meaning stale auth/session state could persist across route changes.
  void url.pathname;
};
