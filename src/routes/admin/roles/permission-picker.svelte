<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { groupState, type PermissionGroup } from "$lib/rbac/permission-tree";

  interface Props {
    tree: PermissionGroup[];
    selected: string[];
    onToggleKey: (key: string, checked: boolean) => void;
    onToggleGroup: (group: PermissionGroup, checked: boolean) => void;
  }

  let { tree, selected, onToggleKey, onToggleGroup }: Props = $props();

  const holds = $derived(new Set(selected));
</script>

<div class="grid gap-3">
  {#each tree as group (group.id)}
    {@const state = groupState(group, selected)}
    {@const hasBody = group.actions.length > 0 || group.children.length > 0}
    <div class="rounded-lg border overflow-hidden">
      <div
        class={[
          "flex items-start gap-2.5 bg-muted/40 px-3 py-2.5",
          hasBody && "border-b",
        ]}
      >
        <!--
          The group heading is its own `view` permission — the one that opens
          the page. Unticking it clears everything nested under it, because
          the rest could never be exercised without it.
        -->
        <Checkbox
          id={group.id}
          class="mt-0.5"
          checked={holds.has(group.viewKey)}
          onCheckedChange={(checked) =>
            onToggleKey(group.viewKey, checked === true)}
        />
        <div class="grid gap-0.5 min-w-0 flex-1">
          <label for={group.id} class="text-sm font-medium leading-none">
            {group.label}
          </label>
          <p class="text-xs text-muted-foreground">{group.viewDescription}</p>
        </div>

        {#if hasBody}
          <button
            type="button"
            class="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onclick={() => onToggleGroup(group, state !== "all")}
          >
            {state === "all" ? "Clear all" : "Select all"}
          </button>
        {/if}
      </div>

      {#if hasBody}
        <div class="grid gap-1 p-2">
          {#each group.actions as action (action.key)}
            <label
              class="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/50"
            >
              <Checkbox
                checked={holds.has(action.key)}
                onCheckedChange={(checked) =>
                  onToggleKey(action.key, checked === true)}
              />
              <span>{action.description}</span>
            </label>
          {/each}

          <!--
            One level of nesting, and no more — the key flattening stops being
            unambiguous below this, so the tree can never grow a third tier.
          -->
          {#each group.children as child (child.id)}
            <div class="rounded-md px-1.5 py-1.5 hover:bg-muted/40">
              <label class="flex items-start gap-2.5 text-sm">
                <Checkbox
                  class="mt-0.5"
                  checked={holds.has(child.viewKey)}
                  onCheckedChange={(checked) =>
                    onToggleKey(child.viewKey, checked === true)}
                />
                <span class="grid gap-0.5">
                  <span class="font-medium leading-none">{child.label}</span>
                  <span class="text-xs text-muted-foreground">
                    {child.viewDescription}
                  </span>
                </span>
              </label>

              {#if child.actions.length}
                <div class="mt-1 grid gap-1 ps-6.5">
                  {#each child.actions as action (action.key)}
                    <label class="flex items-center gap-2.5 text-sm">
                      <Checkbox
                        checked={holds.has(action.key)}
                        onCheckedChange={(checked) =>
                          onToggleKey(action.key, checked === true)}
                      />
                      <span class="text-muted-foreground">
                        {action.description}
                      </span>
                    </label>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
