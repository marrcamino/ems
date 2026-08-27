<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import { LayoutPanelTop, Plus } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import AddEditOrgUnitDialog from "./add-edit-org-unit-dialog.svelte";
  import { setOrgUnitContext } from "./context.svelte.js";
  import DeleteAlertDialog from "./delete-alert-dialog.svelte";
  import MoveOrgUnitDialog from "./move-org-unit-dialog.svelte";
  import OrgChart from "./org-chart.svelte";

  let { data } = $props();

  const ctx = setOrgUnitContext();
  const gblCtx = getGlobalContext();

  onMount(() => {
    ctx.orgUnits = data.orgUnits;
    ctx.rawOrgUnits = data.orgUnits;
  });
</script>

<svelte:head>
  <title>Organizational Structure - EMS</title>
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
          <Breadcrumb.Page>Organizational Structure</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    <div class="ml-auto">
      {#if gblCtx.can("admin:manage_org_units")}
        <Button onclick={() => (ctx.addEditDialog = true)}><Plus /> Add</Button>
      {/if}
    </div>
  </div>
</header>
<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
  {#if ctx.orgUnits.length}
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b pb-4 pt-2 px-0.5"
    >
      <div class="flex items-center gap-3">
        <Checkbox id="show-inactive" bind:checked={ctx.showInactiveOrgUnit} />
        <Label for="show-inactive">Show inactive division/section/unit</Label>
      </div>

      {#if gblCtx.can("admin:manage_org_units")}
        <p class="text-sm text-muted-foreground">
          Drag a box onto the one it should belong to. You will be asked to
          confirm before anything changes.
        </p>
      {/if}
    </div>

    <div
      // class="h-[calc(100dvh-10rem)] min-h-105 overflow-hidden rounded-xl border"
      class="h-full overflow-hidden rounded-xl border"
    >
      <SvelteFlowProvider>
        <OrgChart />
      </SvelteFlowProvider>
    </div>
  {:else}
    <Empty.Root class="border border-dashed">
      <Empty.Header class="max-w-md">
        <Empty.Media variant="icon">
          <LayoutPanelTop />
        </Empty.Media>
        <Empty.Title>Set up your organization</Empty.Title>
        <Empty.Description>
          Add your office to start building your organizational structure.
          Everything else — divisions, sections, and units — will branch from
          it.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button
          variant="outline"
          size="sm"
          onclick={() => (ctx.addEditDialog = true)}>Add Office</Button
        >
      </Empty.Content>
    </Empty.Root>
  {/if}
</div>

<AddEditOrgUnitDialog />
<DeleteAlertDialog />
<MoveOrgUnitDialog />
