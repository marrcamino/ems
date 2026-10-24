<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { KeyRound, UserMinus } from "@lucide/svelte/icons";
  import { isTemporarilyLocked, type UserRow } from "./context.svelte.js";
  import { formatDateTime } from "./format.js";

  let { user }: { user: UserRow } = $props();

  const locked = $derived(isTemporarilyLocked(user));
  const status = $derived(locked ? "locked" : user.accountStatus);

  /**
   * The person behind this login has left the office, so the sign-in refuses
   * them whatever the account itself says. Shown first, with the account's own
   * status greyed out behind it — without this the row would read "Active" for
   * an account that does not work.
   */
  const hasLeft = $derived(user.employee.employmentStatus !== "active");

  const LABELS = {
    active: "Active",
    inactive: "Inactive",
    locked: "Locked out",
  } as const;
</script>

<div class="flex flex-wrap items-center gap-1.5">
  {#if hasLeft}
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Badge {...props} variant="outline">
            <UserMinus /> Person has left
          </Badge>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content class="max-w-64">
        This person is marked as no longer employed on the Employees page. They
        cannot sign in, even though the account is still here.
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}

  <Badge variant={status === "active" && !hasLeft ? "secondary" : "outline"}>
    <span
      class="size-1.5 rounded-full"
      class:bg-emerald-500={status === "active" && !hasLeft}
      class:bg-amber-500={status === "locked" && !hasLeft}
      class:bg-muted-foreground={status === "inactive" || hasLeft}
    ></span>
    {LABELS[status]}
  </Badge>

  {#if locked && user.lockedUntil}
    <span class="text-xs text-muted-foreground">
      until {formatDateTime(user.lockedUntil)}
    </span>
  {/if}

  {#if user.mustChangePassword && status !== "inactive" && !hasLeft}
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
