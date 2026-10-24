<script lang="ts">
  import type { PageProps } from "./$types";
  import Header from "@/components/header.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Fuel - EMS</title>
</svelte:head>

<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item class="hidden md:block">
        <Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator class="hidden md:block" />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Fuel</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>
