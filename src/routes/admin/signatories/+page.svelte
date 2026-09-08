<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import Header from "@/components/header.svelte";
  import { Fuel } from "@lucide/svelte";
  import { TAB_CONTENTS } from "./tab-content/index.js";

  let { data } = $props();
</script>

<svelte:head>
  <title>Signatories - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/admin">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Signatories</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>

<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0">
  <Tabs.Root value="fuel">
    <Tabs.List variant="line">
      <Tabs.Trigger value="fuel">
        <Fuel />
        <span>Fuel</span>
      </Tabs.Trigger>
    </Tabs.List>

    {#each TAB_CONTENTS as TabContent}
      <TabContent {data} />
    {/each}
  </Tabs.Root>
</div>
