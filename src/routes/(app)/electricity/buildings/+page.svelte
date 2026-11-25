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
    Building,
    RotateCcw,
    Archive,
  } from "@lucide/svelte/icons";
  import { SvelteSet } from "svelte/reactivity";
  import { toast } from "svelte-sonner";
  import { buildingColour } from "../electricity-format";
  import type { ElectricityBuilding } from "../electricity-types";
  import BuildingDialog from "./building-dialog.svelte";

  let { data } = $props();

  const gblCtx = getGlobalContext();
  const canManage = $derived(gblCtx.can("electricity:manage"));
  const buildings = $derived(data.buildings);

  /**
   * Which buildings the table shows. Kept in the address so a reload keeps the
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
    active: buildings.filter((r) => r.status === "active").length,
    inactive: buildings.filter((r) => r.status === "inactive").length,
    all: buildings.length,
  });
  const shown = $derived(
    statusFilter === "all"
      ? buildings
      : buildings.filter((r) => r.status === statusFilter),
  );

  let buildingOpen = $state(false);
  let buildingToEdit = $state<ElectricityBuilding | null>(null);

  function openBuilding(building: ElectricityBuilding | null) {
    buildingToEdit = building;
    buildingOpen = true;
  }

  /**
   * Every status toast shares this id, so a new one replaces the one on
   * screen, and only the latest change offers Undo.
   */
  const STATUS_TOAST_ID = "electricity-building-status";
  /** Buildings with a status change on its way, so only their menu is disabled. */
  const pending = new SvelteSet<number>();

  /** Makes a building active or inactive from its menu; undone from the toast. */
  async function setActive(building: ElectricityBuilding, active: boolean) {
    pending.add(building.buildingPk);
    try {
      const body = new FormData();
      body.set("buildingPk", String(building.buildingPk));
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
          `${building.name} not made ${active ? "active" : "inactive"}`,
          { id: STATUS_TOAST_ID, description: error ?? "Try again." },
        );
        return;
      }
      await invalidateAll();
      toast.success(
        `${building.name} made ${active ? "active" : "inactive"}`,
        {
          id: STATUS_TOAST_ID,
          action: {
            label: "Undo",
            onClick: () =>
              setActive(
                { ...building, status: active ? "active" : "inactive" },
                !active,
              ),
          },
        },
      );
    } finally {
      pending.delete(building.buildingPk);
    }
  }
</script>

<svelte:head>
  <title>Electricity Buildings - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/electricity">Electricity</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Buildings</Breadcrumb.Page>
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
      <Button class="ml-auto" onclick={() => openBuilding(null)}>
        <Plus />
        Add building
      </Button>
    {/if}
  </div>

  <div class="w-full max-w-5xl pt-3">
    {#if shown.length === 0}
      <Empty.Root class="border py-12">
        <Empty.Header>
          <Empty.Media variant="icon">
            <Building />
          </Empty.Media>
          <Empty.Title>
            {statusFilter === "inactive"
              ? "No inactive buildings"
              : "No buildings yet"}
          </Empty.Title>
          <Empty.Description>
            {statusFilter === "inactive"
              ? "A building made inactive shows here."
              : canManage
                ? "Add each building whose electricity is recorded on its own."
                : "Nothing is recorded yet."}
          </Empty.Description>
        </Empty.Header>
        {#if canManage && statusFilter !== "inactive"}
          <Empty.Content>
            <Button onclick={() => openBuilding(null)}>
              <Plus />
              Add building
            </Button>
          </Empty.Content>
        {/if}
      </Empty.Root>
    {:else}
      <Table.Root containerClass="rounded-lg border">
        <Table.Header class="bg-muted/80">
          <Table.Row>
            <Table.Head>Building</Table.Head>
            <Table.Head class="text-right">Entries</Table.Head>
            {#if statusFilter === "all"}
              <Table.Head>Status</Table.Head>
            {/if}
            {#if canManage}
              <Table.Head class="w-0"></Table.Head>
            {/if}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each shown as building (building.buildingPk)}
            <Table.Row
              class={building.status === "inactive" && statusFilter === "all"
                ? "text-muted-foreground"
                : ""}
            >
              <Table.Cell class="font-medium">
                <span class="flex items-center gap-2">
                  <!-- Its colour on the Summary's chart. -->
                  <span
                    class="size-2.5 shrink-0 rounded-full bg-(--light) dark:bg-(--dark)"
                    style={buildingColour(building.order)}
                  ></span>
                  {building.name}
                </span>
              </Table.Cell>
              <Table.Cell class="text-right tabular-nums">
                {building.entries}
              </Table.Cell>
              {#if statusFilter === "all"}
                <Table.Cell>
                  <Badge
                    variant={building.status === "active"
                      ? "secondary"
                      : "outline"}
                  >
                    {building.status === "active" ? "Active" : "Inactive"}
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
                      onclick={() => openBuilding(building)}
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
                        disabled={pending.has(building.buildingPk)}
                      >
                        <EllipsisVertical />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        {#if building.status === "active"}
                          <DropdownMenu.Item
                            onclick={() => setActive(building, false)}
                          >
                            <Archive /> Make inactive
                          </DropdownMenu.Item>
                        {:else}
                          <DropdownMenu.Item
                            onclick={() => setActive(building, true)}
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

<BuildingDialog bind:open={buildingOpen} building={buildingToEdit} />
