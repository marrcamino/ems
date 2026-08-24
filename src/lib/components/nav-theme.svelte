<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import { toggleMode } from "mode-watcher";
</script>

<Sidebar.MenuItem>
  <Sidebar.MenuButton onclick={toggleMode}>
    <SunIcon
      class="size-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
    />
    <MoonIcon
      class="absolute size-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
    />
    <span class="dark:hidden">Dark mode</span>
    <span class="hidden dark:inline">Light mode</span>
  </Sidebar.MenuButton>
</Sidebar.MenuItem>
