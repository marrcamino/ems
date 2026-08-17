<script lang="ts">
  import AdminSidebar from "$lib/components/admin-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  let { children } = $props();
</script>

<svelte:head>
  <title>Admin - EMS</title>
</svelte:head>

<Sidebar.Provider>
  <AdminSidebar />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
