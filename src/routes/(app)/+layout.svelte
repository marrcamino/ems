<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { setGlobalContext } from "../global-context.svelte";

  setGlobalContext();
  let { children } = $props();
</script>

<svelte:head>
  <title>EMS</title>
</svelte:head>

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
