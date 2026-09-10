<script lang="ts">
  import Header from "@/components/header.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Tags } from "@lucide/svelte/icons";

  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Assets - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/admin">Home</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/admin/fuel">Fuel Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Assets</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0">
  <div class="flex items-start justify-between gap-4">
    <div class="grid gap-1">
      <h1 class="text-lg font-semibold">Assets</h1>
      <p class="text-muted-foreground max-w-prose text-sm">
        The vehicles, generators, and other machines the office fuels.
      </p>
    </div>
    <Button variant="outline" href="/admin/fuel/assets/types">
      <Tags />
      {data.activeAssetTypeCount === 0
        ? "Set up asset types"
        : "Manage asset types"}
    </Button>
  </div>
</div>
