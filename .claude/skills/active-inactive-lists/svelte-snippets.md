# Svelte 5 + shadcn-svelte snippets

All code here uses runes (`$state`, `$derived`, `$props`, `$effect`), Svelte 5 event attributes (`onclick`), and `svelte-sonner` for toasts. Adapt names to the entity at hand.

## 1. Load function — parse status from the URL

`src/routes/vehicles/+page.ts`:

```ts
import type { PageLoad } from './$types';

const STATUSES = ['active', 'inactive', 'all'] as const;
export type Status = (typeof STATUSES)[number];

export type Vehicle = {
  id: number;
  plateNo: string;
  model: string;
  isActive: boolean;
};

export const load: PageLoad = async ({ fetch, url }) => {
  const raw = url.searchParams.get('status');
  const status: Status = (STATUSES as readonly string[]).includes(raw ?? '')
    ? (raw as Status)
    : 'active';

  const res = await fetch(`/api/vehicles?status=${status}`);
  if (!res.ok) throw new Error('Failed to load vehicles');

  const body: { data: Vehicle[]; counts: Record<Status, number> } = await res.json();

  return { status, vehicles: body.data, counts: body.counts };
};
```

Validating rather than trusting the param matters: a hand-edited `?status=deleted` should fall back to the default view, not send garbage to the API.

## 2. Filter control bound to the URL

```svelte
<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { Status } from './+page';

  let { status, counts }: { status: Status; counts: Record<Status, number> } = $props();

  function setStatus(next: string) {
    const url = new URL(page.url);
    if (next === 'active') url.searchParams.delete('status');
    else url.searchParams.set('status', next);
    url.searchParams.delete('page'); // page 3 of "active" is meaningless in "inactive"
    goto(url, { keepFocus: true, noScroll: true });
  }
</script>

<Tabs.Root value={status} onValueChange={setStatus}>
  <Tabs.List>
    <Tabs.Trigger value="active">Active ({counts.active})</Tabs.Trigger>
    <Tabs.Trigger value="inactive">Inactive ({counts.inactive})</Tabs.Trigger>
    <Tabs.Trigger value="all">All ({counts.all})</Tabs.Trigger>
  </Tabs.List>
</Tabs.Root>
```

`keepFocus` and `noScroll` keep a filter change from feeling like a page load. Resetting `page` avoids landing on an out-of-range page after switching.

`page` comes from `$app/state` on SvelteKit 2.12+. On older versions import `page` from `$app/stores` and read `$page.url`.

## 3. Local list state that stays in sync with `load`

```ts
let { data } = $props();

let vehicles = $state([...data.vehicles]);
let counts = $state({ ...data.counts });
let pending = $state(new Set<number>());

// Re-sync whenever a navigation delivers fresh data (filter change, invalidate).
$effect(() => {
  vehicles = [...data.vehicles];
  counts = { ...data.counts };
});
```

The local copy exists so a single toggle can update one row without refetching the page. Copy the arrays — mutating `data.vehicles` directly fights SvelteKit's caching of load results.

`pending` tracks which rows have an in-flight request, so their buttons can disable individually instead of freezing the whole table.

## 4. The toggle handler

Pessimistic (default): await the server, then update.

```ts
import { toast } from 'svelte-sonner';

async function setActive(vehicle: Vehicle, isActive: boolean) {
  pending.add(vehicle.id);
  pending = new Set(pending);

  try {
    const res = await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? 'Request failed');
    }

    applyStatusChange(vehicle.id, isActive);

    toast(isActive ? 'Vehicle activated' : 'Vehicle deactivated', {
      action: {
        label: 'Undo',
        onClick: () => setActive(vehicle, !isActive)
      }
    });
  } catch (err) {
    toast.error(
      `Could not ${isActive ? 'activate' : 'deactivate'} ${vehicle.plateNo}`,
      { description: err instanceof Error ? err.message : undefined }
    );
  } finally {
    pending.delete(vehicle.id);
    pending = new Set(pending);
  }
}

function applyStatusChange(id: number, isActive: boolean) {
  const stays = data.status === 'all' || (data.status === 'active') === isActive;

  if (stays) {
    vehicles = vehicles.map((v) => (v.id === id ? { ...v, isActive } : v));
  } else {
    vehicles = vehicles.filter((v) => v.id !== id);
  }

  counts = {
    ...counts,
    active: counts.active + (isActive ? 1 : -1),
    inactive: counts.inactive + (isActive ? -1 : 1)
  };
}
```

`applyStatusChange` is the rule from the skill body in one expression: the row stays in the `all` view, and stays in `active`/`inactive` only when its new status matches the view.

The undo action calls the same function with the flag inverted, which means undo gets the same error handling and its own confirming toast for free.

For the optimistic variant, call `applyStatusChange` before the `fetch` and call it again with the original value inside `catch`. Only do this when latency is actually visible — it doubles the number of states to reason about.

## 5. Rendering the row

```svelte
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
</script>

<ul class="divide-y">
  {#each vehicles as vehicle (vehicle.id)}
    <li
      animate:flip={{ duration: 200 }}
      out:fade={{ duration: 150 }}
      class="flex items-center justify-between gap-4 py-3"
      class:opacity-60={!vehicle.isActive}
    >
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium">{vehicle.plateNo}</span>
          {#if !vehicle.isActive}
            <Badge variant="secondary">Inactive</Badge>
          {/if}
        </div>
        <p class="text-muted-foreground truncate text-sm">{vehicle.model}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={pending.has(vehicle.id)}
        onclick={() => setActive(vehicle, !vehicle.isActive)}
      >
        {vehicle.isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </li>
  {/each}
</ul>

{#if vehicles.length === 0}
  <p class="text-muted-foreground py-8 text-center text-sm">
    {data.status === 'inactive'
      ? 'No inactive vehicles.'
      : data.status === 'all'
        ? 'No vehicles yet.'
        : 'No active vehicles. Check the Inactive tab.'}
  </p>
{/if}
```

The empty state differs per filter. "No vehicles" shown while 12 sit in the Inactive tab is actively misleading.

Muting is opacity plus the badge — not strikethrough, which reads as deleted, and not red, which reads as an error.

### Table caveat

`transition:`, `in:`, `out:`, and `animate:` are element-only directives. They do not work on components, so `<Table.Row animate:flip>` will not compile. For a shadcn-svelte `Table`, either:

- drop the exit animation and rely on the toast plus the changing counts to explain the removal, or
- render raw `<tr>` / `<td>` elements with the same utility classes the shadcn components apply, and put the directives on those.

Skipping the animation is usually the better trade. Reimplemented table rows drift from the component library over time.

## 6. Confirm dialog — only when deactivation cascades

Skip this for simple rows. Add it when deactivating one record hides others, or when the user asks for it.

```svelte
<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { buttonVariants } from '$lib/components/ui/button/index.js';

  let confirming = $state<Vehicle | null>(null);
</script>

<AlertDialog.Root
  open={confirming !== null}
  onOpenChange={(open) => { if (!open) confirming = null; }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Deactivate {confirming?.plateNo}?</AlertDialog.Title>
      <AlertDialog.Description>
        It will stop appearing in trip forms and dropdowns. Existing records keep
        referencing it, and you can reactivate it any time.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class={buttonVariants({ variant: 'destructive' })}
        onclick={() => {
          if (confirming) setActive(confirming, false);
          confirming = null;
        }}
      >
        Deactivate
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

Confirm on deactivate only. Activating is harmless and reversible, so a dialog there is pure friction.

The description says what actually changes. "Are you sure?" tells the user nothing they didn't already know.

## 7. Pickers — active only, plus the current value

```svelte
<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';

  let {
    vehicles,
    value = $bindable<string | undefined>()
  }: { vehicles: Vehicle[]; value: string | undefined } = $props();

  // Active options, plus whatever is already selected even if it went inactive.
  let options = $derived.by(() => {
    const active = vehicles.filter((v) => v.isActive);
    const selected = vehicles.find((v) => String(v.id) === value);
    return selected && !selected.isActive ? [selected, ...active] : active;
  });

  let selectedLabel = $derived(
    options.find((v) => String(v.id) === value)?.plateNo ?? 'Select a vehicle'
  );
</script>

<Select.Root type="single" bind:value>
  <Select.Trigger>{selectedLabel}</Select.Trigger>
  <Select.Content>
    {#each options as vehicle (vehicle.id)}
      <Select.Item value={String(vehicle.id)} label={vehicle.plateNo}>
        {vehicle.plateNo}
        {#if !vehicle.isActive}
          <span class="text-muted-foreground ml-2 text-xs">(inactive)</span>
        {/if}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
```

Without the exception, opening an old record whose vehicle was since retired shows an empty picker, and saving silently blanks a field the user never touched. Including the stale value — visibly labelled — lets them keep it or change it deliberately.

`Select.Root` needs `type="single"` in current shadcn-svelte, and `Select.Item` values are strings, so ids get `String()`-wrapped on the way in and `Number()`-parsed on the way out.

## 8. Historical references

Anywhere an old record displays a related entity, resolve it by id without filtering on status, and mark it so the reader knows why it is missing from today's dropdowns:

```svelte
<span>{trip.vehicle.plateNo}</span>
{#if !trip.vehicle.isActive}
  <span class="text-muted-foreground text-xs">(inactive)</span>
{/if}
```

A 2024 trip report that prints a blank driver because the driver has since resigned is a data-loss bug, even though the row is technically still there.
