<script lang="ts">
  import AppSidebar from "@/components/navigation/app-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { setGlobalContext } from "../global-context.svelte";

  setGlobalContext();
  let { children } = $props();
</script>

<svelte:head>
  <title>EMS</title>
</svelte:head>

<!--
  One layout for every signed-in page, the (admin) group included. It checks
  no key itself: each page's load checks the one it needs.
-->
<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
