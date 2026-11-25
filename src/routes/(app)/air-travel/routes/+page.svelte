<script lang="ts">
  import { deserialize } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import Header from "@/components/header.svelte";
  import {
    EllipsisVertical,
    Pencil,
    Plus,
    Route,
    RotateCcw,
    Archive,
  } from "@lucide/svelte/icons";
  import { SvelteSet } from "svelte/reactivity";
  import { toast } from "svelte-sonner";
  import { formatCount } from "../air-travel-format";
  import type { AirTravelRoute } from "../air-travel-types";
  import RouteDialog from "./route-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("air_travel:manage"));
  const routes = $derived(data.routes);

  /**
   * Which routes the table shows. Kept in the address so a reload keeps the
   * view; `active` is the default and so is never written there.
   */
  type StatusFilter = "active" | "inactive" | "all";
  const statusFilter = $derived.by<StatusFilter>(() => {
    const raw = page.url.searchParams.get("status");
    return raw === "inactive" || raw === "all" ? raw : "active";
  });

  function setStatusFilter(next: string) {
    const url = new URL(page.url);
    if (next === "active") url.searchParams.delete("status");
    else url.searchParams.set("status", next);
    // Replaced, so Back leaves the page instead of stepping through tabs.
    goto(url, { keepFocus: true, noScroll: true, replaceState: true });
  }

  const counts = $derived({
    active: routes.filter((r) => r.status === "active").length,
    inactive: routes.filter((r) => r.status === "inactive").length,
    all: routes.length,
  });
  const shown = $derived(
    statusFilter === "all"
      ? routes
      : routes.filter((r) => r.status === statusFilter),
  );

  const routeName = (r: AirTravelRoute) => `${r.placeA} – ${r.placeB}`;

  let routeOpen = $state(false);
  let routeToEdit = $state<AirTravelRoute | null>(null);

  function openRoute(route: AirTravelRoute | null) {
    routeToEdit = route;
    routeOpen = true;
  }

  /**
   * Every status toast shares this id, so a new one replaces the one on
   * screen, and only the latest change offers Undo.
   */
  const STATUS_TOAST_ID = "air-travel-route-status";
  /** Routes with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /** Makes a route active or inactive from its menu; undone from the toast. */
  async function setActive(route: AirTravelRoute, active: boolean) {
    pending.add(route.routePk);
    try {
      const body = new FormData();
      body.set("routePk", String(route.routePk));
      body.set("status", active ? "active" : "inactive");
      const response = await fetch("?/setStatus", {
        method: "POST",
        body,
        headers: { "x-sveltekit-action": "true" },
      });
      const result = deserialize(await response.text());
      if (result.type !== "success") {
        const error =
          result.type === "failure"
            ? (result.data as { error?: string } | undefined)?.error
            : undefined;
        toast.error(
          `${routeName(route)} not made ${active ? "active" : "inactive"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }
      await invalidateAll();
      toast.success(
        `${routeName(route)} made ${active ? "active" : "inactive"}`,
        {
          id: STATUS_TOAST_ID,
          action: {
            label: "Undo",
            onClick: () =>
              setActive(
                { ...route, status: active ? "active" : "inactive" },
                !active,
              ),
          },
        },
      );
    } finally {
      pending.delete(route.routePk);
    }
  }
</script>

<svelte:head>
  <title>Air Travel Routes - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/air-travel">Air Travel</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Routes</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col items-center p-4 pt-0">
  <div
    class="flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 pt-1"
  >
    {#snippet tabCount(count: number)}
      <span class="text-muted-foreground">{count}</span>
    {/snippet}

    <Tabs.Root value={statusFilter} onValueChange={setStatusFilter}>
      <Tabs.List>
        <Tabs.Trigger value="active">
          Active {@render tabCount(counts.active)}
        </Tabs.Trigger>
        <Tabs.Trigger value="inactive">
          Inactive {@render tabCount(counts.inactive)}
        </Tabs.Trigger>
        <Tabs.Trigger value="all">
          All {@render tabCount(counts.all)}
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    {#if canManage}
      <Button class="ml-auto" onclick={() => openRoute(null)}>
        <Plus />
        Add route
      </Button>
    {/if}
  </div>

  <div class="w-full max-w-5xl pt-3">
    {#if shown.length === 0}
      <Empty.Root class="border py-12">
        <Empty.Header>
          <Empty.Media variant="icon">
            <Route />
          </Empty.Media>
          <Empty.Title>
            {statusFilter === "inactive"
              ? "No inactive routes"
              : "No routes yet"}
          </Empty.Title>
          <Empty.Description>
            {statusFilter === "inactive"
              ? "A route made inactive shows here."
              : canManage
                ? "Add each route that staff fly, with its distance."
                : "Nothing is recorded yet."}
          </Empty.Description>
        </Empty.Header>
        {#if canManage && statusFilter !== "inactive"}
          <Empty.Content>
            <Button onclick={() => openRoute(null)}>
              <Plus />
              Add route
            </Button>
          </Empty.Content>
        {/if}
      </Empty.Root>
    {:else}
      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Route</Table.Head>
            <Table.Head class="text-right">Distance (km)</Table.Head>
            <Table.Head>Source</Table.Head>
            <Table.Head class="text-right">Flights</Table.Head>
            {#if statusFilter === "all"}
              <Table.Head>Status</Table.Head>
            {/if}
            {#if canManage}
              <Table.Head class="w-0"></Table.Head>
            {/if}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each shown as route (route.routePk)}
            <Table.Row
              class={route.status === "inactive" && statusFilter === "all"
                ? "text-muted-foreground"
                : ""}
            >
              <Table.Cell class="font-medium">{routeName(route)}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {formatCount(route.distanceKm)}
              </Table.Cell>
              <Table.Cell class="whitespace-normal text-muted-foreground">
                {route.source ?? "—"}
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {formatCount(route.flights)}
              </Table.Cell>
              {#if statusFilter === "all"}
                <Table.Cell>
                  <Badge
                    variant={route.status === "active"
                      ? "secondary"
                      : "outline"}
                  >
                    {route.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
              {/if}
              {#if canManage}
                <Table.Cell>
                  <ButtonGroup.Root>
                    <Button
                      variant="secondary"
                      size="sm"
                      class="border-r-0"
                      onclick={() => openRoute(route)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <ButtonGroup.Separator />
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        class={buttonVariants({
                          variant: "secondary",
                          size: "icon-sm",
                        })}
                        aria-label="More actions"
                        disabled={pending.has(route.routePk)}
                      >
                        <EllipsisVertical />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        {#if route.status === "active"}
                          <DropdownMenu.Item
                            onclick={() => setActive(route, false)}
                          >
                            <Archive /> Make inactive
                          </DropdownMenu.Item>
                        {:else}
                          <DropdownMenu.Item
                            onclick={() => setActive(route, true)}
                          >
                            <RotateCcw /> Make active
                          </DropdownMenu.Item>
                        {/if}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </ButtonGroup.Root>
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>

<RouteDialog bind:open={routeOpen} route={routeToEdit} />
