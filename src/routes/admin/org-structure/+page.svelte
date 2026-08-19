<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { LayoutPanelTop, Plus } from "@lucide/svelte";
  import { onMount } from "svelte";
  import AddEditOrgUnitDialog from "./add-edit-org-unit-dialog.svelte";
  import { setOrgUnitContext } from "./context.svelte.js";
  import DeleteAlertDialog from "./delete-alert-dialog.svelte";
  import OrgUnitNode from "./org-unit-node.svelte";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Label } from "$lib/components/ui/label";
  let { data } = $props();

  const ctx = setOrgUnitContext();

  onMount(() => {
    ctx.orgUnits = data.orgUnits;
    ctx.rawOrgUnits = data.orgUnits;
  });
</script>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl"
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
          <Breadcrumb.Link href="/admin">Dashbaord</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator class="hidden md:block" />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Organizational Structure</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    <div class="ml-auto">
      <Button onclick={() => (ctx.addEditDialog = true)}><Plus /> Add</Button>
    </div>
  </div>
</header>
<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
  {#if ctx.orgUnits.length}
    <div class="border-b pb-4 pt-2 px-0.5">
      <div class="flex items-center gap-3">
        <Checkbox id="show-inactive" bind:checked={ctx.showInactiveOrgUnit} />
        <Label for="show-inactive">Show inactive division/section/unit</Label>
      </div>
    </div>

    <div class="overflow-x-auto px-6 py-10">
      <ul class="flex justify-center">
        {#each ctx.orgUnitTree as node (node.orgUnitPk)}
          <OrgUnitNode {node} />
        {/each}
      </ul>
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
