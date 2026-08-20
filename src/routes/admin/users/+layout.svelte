<script lang="ts">
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
  <title>Users - EMS</title>
</svelte:head>

{@render children()}
