<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import Button from "@/components/ui/button/button.svelte";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { getOrgUnitContext } from "./context.svelte";
  import { initials } from "@/utils";

  const MAX_AVATARS = 3;
  const ctx = getOrgUnitContext();

  let visibleUsers = $derived(ctx.assignedUsers.slice(0, MAX_AVATARS));
  let count = $derived(ctx.assignedUsers.length);
  let displayCount = $derived(count > 99 ? "99+" : String(count));
</script>

<div class="pt-2">
  {#if count === 0}
    <div class="flex items-center">
      <div class="flex -space-x-3">
        {@render emptyAvatar()}
        {@render emptyAvatar()}
        {@render emptyAvatar()}
      </div>

      <p class="text-sm text-muted-foreground px-1">No users assigned yet.</p>
    </div>
  {:else}
    <Button
      type="button"
      size="lg"
      onclick={() => {
        ctx.assignedUsersDialog = true;
      }}
      variant="ghost"
      class="pl-1"
    >
      <div class="flex -space-x-3">
        {#each visibleUsers as user (user.userPk)}
          <Avatar.Root class="size-7">
            <Avatar.Fallback class="text-[10px]"
              >{initials(user)}</Avatar.Fallback
            >
          </Avatar.Root>
        {/each}
      </div>

      <span class="text-sm font-medium">Assigned Users</span>
      <span class="text-sm text-muted-foreground">{displayCount}</span>

      <ChevronRightIcon class="ml-auto h-4 w-4 text-muted-foreground" />
    </Button>
  {/if}
</div>

{#snippet emptyAvatar()}
  <div
    class="size-7 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6 group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten items-center justify-center bg-muted text-muted-foreground"
  >
    ?
  </div>
{/snippet}
