<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { initials } from "@/utils";
  import { fullName, getUsersContext, type UserRow } from "./context.svelte.js";

  let { user }: { user: UserRow } = $props();

  const ctx = getUsersContext();

  // Marked because several actions are refused on your own account — you
  // cannot change your own role, switch yourself off, or delete yourself.
  const isSelf = $derived(ctx.isSelf(user));
</script>

<div class="flex items-center gap-3">
  <Avatar.Root class="size-8">
    <Avatar.Fallback class="text-xs">{initials(user.employee)}</Avatar.Fallback>
  </Avatar.Root>

  <div class="grid min-w-0 gap-0.5">
    <div class="flex items-center gap-2">
      <span class="font-medium">{fullName(user.employee)}</span>
      {#if isSelf}
        <Badge variant="secondary">You</Badge>
      {/if}
    </div>
    <span class="truncate text-xs text-muted-foreground">
      {user.username}{user.employee.positionTitle
        ? ` · ${user.employee.positionTitle}`
        : ""}
    </span>
  </div>
</div>
