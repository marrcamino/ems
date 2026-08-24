<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import {
    Building,
    LogIn,
    Search,
    ShieldCheck,
    ToggleLeft,
    UserRound,
    X,
  } from "@lucide/svelte/icons";
  import FacetedFilter from "./faceted-filter.svelte";
  import {
    countActiveFilters,
    emptyUserFilters,
    type UserFacets,
    type UserFilterId,
    type UserFilterState,
  } from "./filters.js";

  interface Props {
    search: string;
    filters: UserFilterState;
    facets: UserFacets;
    matched: number;
    total: number;
  }

  let {
    search = $bindable(),
    filters = $bindable(),
    facets,
    matched,
    total,
  }: Props = $props();

  const activeCount = $derived(countActiveFilters(filters));
  const narrowed = $derived(activeCount > 0 || search.trim().length > 0);

  const CONTROLS: {
    id: UserFilterId;
    label: string;
    icon: typeof ShieldCheck;
  }[] = [
    { id: "role", label: "Role", icon: UserRound },
    { id: "kind", label: "Type", icon: ShieldCheck },
    { id: "section", label: "Section", icon: Building },
    { id: "status", label: "Status", icon: ToggleLeft },
    { id: "signIn", label: "Sign-in", icon: LogIn },
  ];

  function clearEverything() {
    filters = emptyUserFilters();
    search = "";
  }
</script>

<div class="grid gap-2">
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative">
      <Search
        class="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        placeholder="Search name, username, or position..."
        class="h-9 w-72 ps-8"
        bind:value={search}
      />
    </div>

    {#each CONTROLS as control (control.id)}
      <FacetedFilter
        label={control.label}
        icon={control.icon}
        options={facets[control.id]}
        selected={filters[control.id]}
        onChange={(values) => (filters = { ...filters, [control.id]: values })}
      />
    {/each}

    {#if narrowed}
      <Button variant="ghost" onclick={clearEverything} size="lg">
        Reset <X />
      </Button>
    {/if}
  </div>

  {#if narrowed}
    <p class="text-xs text-muted-foreground">
      Showing {matched} of {total}
      {total === 1 ? "person" : "people"}.
    </p>
  {/if}
</div>
