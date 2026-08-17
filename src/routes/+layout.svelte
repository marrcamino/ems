<script lang="ts">
  import favicon from "$lib/assets/favicon.png";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { ModeWatcher } from "mode-watcher";
  import "./layout.css";

  let { children } = $props();
</script>

<svelte:head>
  <title>EMS</title>
  <link rel="icon" href={favicon} type="image/png" />
</svelte:head>

<ModeWatcher defaultMode={"system"} />
<Toaster richColors position="top-right" closeButton class="z-auto" />

{@render children()}
