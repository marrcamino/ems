<script lang="ts">
  import AnimatedList from "$lib/components/animated-list.svelte";
  import ContentTransition from "$lib/components/content-transition.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import {
    ArrowDownAZ,
    ArrowDownToLine,
    ArrowUpAZ,
    ArrowUpToLine,
    RefreshCw,
    RotateCcw,
    Search,
    Shuffle,
    Trash2,
    UserRoundX,
    X,
  } from "@lucide/svelte";

  type Person = {
    id: number;
    name: string;
    position: string;
    office: string;
  };

  const SEED: Person[] = [
    {
      id: 1,
      name: "Ramon Dela Cruz",
      position: "Environmental Management Specialist II",
      office: "Environmental Management Section",
    },
    {
      id: 2,
      name: "Liza Ompad",
      position: "Administrative Assistant III",
      office: "Administrative Section",
    },
    {
      id: 3,
      name: "Noel Bagares",
      position: "Forest Technician II",
      office: "Forest Management Section",
    },
    {
      id: 4,
      name: "Cherry Mae Padin",
      position: "Accountant I",
      office: "Finance Section",
    },
    {
      id: 5,
      name: "Arnel Sumaylo",
      position: "Driver II",
      office: "General Services Unit",
    },
  ];

  const POOL: Omit<Person, "id">[] = [
    {
      name: "Marilou Estoque",
      position: "Planning Officer II",
      office: "Planning Section",
    },
    {
      name: "Jayson Quimpo",
      position: "Information Systems Analyst I",
      office: "Administrative Section",
    },
    {
      name: "Grace Villamor",
      position: "Environmental Management Specialist I",
      office: "Environmental Management Section",
    },
    {
      name: "Dante Ybanez",
      position: "Utility Worker I",
      office: "General Services Unit",
    },
  ];

  let items = $state<Person[]>([...SEED]);
  let loading = $state(false);
  let query = $state("");
  let staggerOn = $state(false);
  let animateHeight = $state(true);
  let useCustomSkeleton = $state(false);
  let animateWhileSearching = $state(false);

  /**
   * Sorting reorders `items` itself, because changing the order is a change to
   * the data. Searching only narrows what is shown, so it lives here as a
   * derived view and never touches `items`.
   */
  const searching = $derived(query.trim() !== "");
  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((person) =>
      `${person.name} ${person.position} ${person.office}`
        .toLowerCase()
        .includes(needle),
    );
  });

  let nextId = SEED.length + 1;
  let poolCursor = 0;

  /** Stands in for a request. A newer reload cancels whatever is still in flight. */
  let requestToken = 0;
  async function fakeFetch(result: Person[]) {
    const token = ++requestToken;
    loading = true;
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (token !== requestToken) return;
    items = result;
    loading = false;
  }

  function makePerson(): Person {
    const source = POOL[poolCursor % POOL.length];
    poolCursor += 1;
    return { ...source, id: nextId++ };
  }

  function addToTop() {
    items = [makePerson(), ...items];
  }

  function addToEnd() {
    items = [...items, makePerson()];
  }

  function removeOne(id: number) {
    items = items.filter((person) => person.id !== id);
  }

  function removeLast() {
    items = items.slice(0, -1);
  }

  function sortByName(direction: 1 | -1) {
    items = [...items].sort((a, b) => direction * a.name.localeCompare(b.name));
  }

  function shuffle() {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    items = shuffled;
  }

  function restoreOriginalOrder() {
    const order = new Map(SEED.map((person, index) => [person.id, index]));
    items = [...items].sort(
      (a, b) => (order.get(a.id) ?? a.id) - (order.get(b.id) ?? b.id),
    );
  }
</script>

<svelte:head>
  <title>List Motion Test - EMS</title>
</svelte:head>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl z-20"
>
  <div class="flex items-center gap-2 px-4 w-full">
    <Sidebar.Trigger class="-ms-1" />
    <Separator
      orientation="vertical"
      class="me-2 data-[orientation=vertical]:h-4"
    />
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item class="hidden md:block">
          <Breadcrumb.Link href="/admin">Dashboard</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator class="hidden md:block" />
        <Breadcrumb.Item>
          <Breadcrumb.Page>List Motion Test</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-3xl">
  <div class="flex flex-col gap-3 border-b pb-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" onclick={() => fakeFetch([...SEED])}>
        <RefreshCw /> Reload with items
      </Button>
      <Button variant="outline" onclick={() => fakeFetch([])}>
        <UserRoundX /> Reload with no items
      </Button>
      <Button onclick={addToTop} disabled={loading}>
        <ArrowUpToLine /> Add to top
      </Button>
      <Button onclick={addToEnd} disabled={loading}>
        <ArrowDownToLine /> Add to end
      </Button>
      <Button
        variant="destructive"
        onclick={removeLast}
        disabled={loading || items.length === 0}
      >
        <Trash2 /> Remove last
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onclick={() => sortByName(1)}
        disabled={loading}
      >
        <ArrowDownAZ /> Sort A to Z
      </Button>
      <Button
        variant="outline"
        onclick={() => sortByName(-1)}
        disabled={loading}
      >
        <ArrowUpAZ /> Sort Z to A
      </Button>
      <Button variant="outline" onclick={shuffle} disabled={loading}>
        <Shuffle /> Shuffle
      </Button>
      <Button
        variant="outline"
        onclick={restoreOriginalOrder}
        disabled={loading}
      >
        <RotateCcw /> Original order
      </Button>
    </div>

    <div class="relative">
      <Search
        class="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        bind:value={query}
        placeholder="Search by name, position or section"
        class="ps-9"
      />
    </div>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div class="flex items-center gap-2">
        <Switch id="stagger" bind:checked={staggerOn} />
        <Label for="stagger">Stagger the rows on arrival</Label>
      </div>
      <div class="flex items-center gap-2">
        <Switch id="animate-height" bind:checked={animateHeight} />
        <Label for="animate-height">Animate the block height</Label>
      </div>
      <div class="flex items-center gap-2">
        <Switch id="custom-skeleton" bind:checked={useCustomSkeleton} />
        <Label for="custom-skeleton">Use the custom skeleton</Label>
      </div>
      <div class="flex items-center gap-2">
        <Switch id="animate-search" bind:checked={animateWhileSearching} />
        <Label for="animate-search"
          >Animate while searching (the wrong way)</Label
        >
      </div>
    </div>

    <p class="text-sm text-muted-foreground">
      Removing a row from the middle is the interesting case: watch the rows
      below it close the gap while the removed one fades. Sorting and shuffling
      move every row at once and should animate. Typing in the search box should
      not — turn the last switch on to feel why.
    </p>
  </div>

  <ContentTransition
    {loading}
    {animateHeight}
    animated={!searching || animateWhileSearching}
    isEmpty={visible.length === 0}
  >
    {#snippet skeleton()}
      <Skeleton class="h-5 w-40" />
    {/snippet}
    {#snippet empty()}
      <p class="text-sm text-muted-foreground">Nothing to count right now.</p>
    {/snippet}
    <p class="text-sm text-muted-foreground">
      {visible.length}
      {searching ? `of ${items.length} match` : "on the list"}.
    </p>
  </ContentTransition>

  <AnimatedList
    {loading}
    {animateHeight}
    items={visible}
    animated={!searching || animateWhileSearching}
    key={(person) => person.id}
    stagger={staggerOn ? 40 : 0}
    skeleton={useCustomSkeleton ? cardSkeleton : undefined}
    skeletonRows={5}
  >
    {#snippet item(person)}
      <div
        class="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{person.name}</p>
          <p class="truncate text-sm text-muted-foreground">
            {person.position} &middot; {person.office}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove {person.name}"
          onclick={() => removeOne(person.id)}
        >
          <X />
        </Button>
      </div>
    {/snippet}

    {#snippet empty()}
      <Empty.Root class="border">
        <Empty.Header>
          <Empty.Media variant="icon">
            {#if searching}
              <Search />
            {:else}
              <UserRoundX />
            {/if}
          </Empty.Media>
          <Empty.Title>
            {searching ? "No one matches that" : "No one to show"}
          </Empty.Title>
          <Empty.Description>
            {searching
              ? "Try a different name, position or section."
              : "Add someone to the list, or reload it with items."}
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          {#if searching}
            <Button variant="outline" onclick={() => (query = "")}>
              Clear the search
            </Button>
          {:else}
            <Button onclick={addToTop}>Add someone</Button>
          {/if}
        </Empty.Content>
      </Empty.Root>
    {/snippet}
  </AnimatedList>
</div>

{#snippet cardSkeleton()}
  <div class="flex flex-col gap-2">
    {#each Array.from({ length: 5 }) as _, index (index)}
      <div class="flex items-center gap-3 rounded-lg border p-3">
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-3 w-72" />
        </div>
        <Skeleton class="size-9 rounded-md" />
      </div>
    {/each}
  </div>
{/snippet}
