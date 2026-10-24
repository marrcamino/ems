<script lang="ts">
  import { Check } from "@lucide/svelte/icons";
  import type { PermissionGroup } from "$lib/rbac/permission-tree";

  /**
   * The read-only rendering of a permission set — used for the super-admin
   * role, which is frozen. Everything it holds is visible so an admin can see
   * exactly what the role does, with nothing to click.
   */
  interface Props {
    tree: PermissionGroup[];
    selected: string[];
  }

  let { tree, selected }: Props = $props();

  const holds = $derived(new Set(selected));
</script>

<div class="grid gap-3">
  {#each tree as group (group.id)}
    <div class="rounded-lg border overflow-hidden">
      <div class="border-b bg-muted/40 px-3 py-2">
        <p class="text-sm font-medium">{group.label}</p>
      </div>

      <ul class="grid gap-1.5 p-3 text-sm">
        {#if holds.has(group.viewKey)}
          <li class="flex items-start gap-2">
            <Check class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{group.viewDescription}</span>
          </li>
        {/if}

        {#each group.actions as action (action.key)}
          {#if holds.has(action.key)}
            <li class="flex items-start gap-2">
              <Check class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>{action.description}</span>
            </li>
          {/if}
        {/each}

      </ul>
    </div>
  {/each}
</div>
