<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import { getOrgUnitContext } from "./context.svelte";
  import { initials } from "@/utils";
  import * as Avatar from "$lib/components/ui/avatar/index.js";

  const ctx = getOrgUnitContext();
</script>

<Dialog.Root bind:open={ctx.assignedUsersDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Assigned Users</Dialog.Title>
      <Dialog.Description>
        <div class="min-h-30">
          <ScrollArea viewPortClasses="max-h-50 pr-4">
            {#if ctx.assignedUsers.length}
              <ul class="divide-y">
                {#each ctx.assignedUsers as user (user.userPk)}
                  <li class="flex items-center gap-3 py-2">
                    <Avatar.Root class="h-8 w-8">
                      <Avatar.Fallback class="text-xs"
                        >{initials(user)}</Avatar.Fallback
                      >
                    </Avatar.Root>
                    <span class="text-sm">{user.firstName} {user.lastName}</span
                    >
                  </li>
                {/each}
              </ul>
            {/if}
          </ScrollArea>
        </div>
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
