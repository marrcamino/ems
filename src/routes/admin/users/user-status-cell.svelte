<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { KeyRound } from "@lucide/svelte/icons";
  import { isTemporarilyLocked, type UserRow } from "./context.svelte.js";
  import { formatDateTime } from "./format.js";

  let { user }: { user: UserRow } = $props();

  const locked = $derived(isTemporarilyLocked(user));
  const status = $derived(locked ? "locked" : user.status);

  const LABELS = {
    active: "Active",
    inactive: "Inactive",
    locked: "Locked out",
  } as const;
</script>

<div class="flex flex-wrap items-center gap-1.5">
  <Badge variant={status === "active" ? "secondary" : "outline"}>
    <span
      class="size-1.5 rounded-full"
      class:bg-emerald-500={status === "active"}
      class:bg-amber-500={status === "locked"}
      class:bg-muted-foreground={status === "inactive"}
    ></span>
    {LABELS[status]}
  </Badge>

  {#if locked && user.lockedUntil}
    <span class="text-xs text-muted-foreground">
      until {formatDateTime(user.lockedUntil)}
    </span>
  {/if}

  {#if user.mustChangePassword && status !== "inactive"}
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Badge {...props} variant="ghost" class="text-muted-foreground">
            <KeyRound /> New password
          </Badge>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content class="max-w-64">
        This person still has the temporary password they were given. They will
        be asked to set their own the next time they sign in.
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</div>
