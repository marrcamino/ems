<script lang="ts">
  import AdminSidebar from "@/components/navigation/admin-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { setGlobalContext } from "../global-context.svelte";

  setGlobalContext();
  let { children } = $props();
</script>

<Sidebar.Provider>
  <AdminSidebar />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
