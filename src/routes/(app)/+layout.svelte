<script lang="ts">
  import StaffSidebar from "@/components/staff-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { setGlobalContext } from "../global-context.svelte";

  setGlobalContext();
  let { children } = $props();
</script>

<svelte:head>
  <title>EMS</title>
</svelte:head>

<Sidebar.Provider>
  <StaffSidebar />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
