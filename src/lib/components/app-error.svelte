<script lang="ts">
  import { page } from "$app/state";
  import ErrorState, {
    type ErrorDetail,
  } from "$lib/components/error-state.svelte";

  let { class: className }: { class?: string } = $props();

  // SvelteKit's own fallbacks ("Not Found", "Internal Error") repeat what the
  // heading already says — only a thrown message adds anything.
  const GENERIC_MESSAGES = ["Not Found", "Internal Error"];

  const isAdmin = $derived(
    (page.data.permissions ?? []).includes("admin:view"),
  );

  const details = $derived.by(() => {
    const rows: ErrorDetail[] = [{ label: "path", value: page.url.pathname }];
    const message = page.error?.message;
    if (message && !GENERIC_MESSAGES.includes(message)) {
      rows.push({ label: "error", value: message });
    }
    if (page.error?.errorId) {
      rows.push({ label: "request", value: page.error.errorId });
    }
    return rows;
  });
</script>

<ErrorState
  status={page.status}
  homeHref={isAdmin ? "/admin" : "/"}
  {details}
  class={className}
/>
