<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import Header from "@/components/header.svelte";
</script>

<svelte:head>
  <title>Dashboard - EMS</title>
</svelte:head>

<!--
  Everyone lands here after signing in. Kept empty until the owner designs it
  (MPP-83); the plan is a card for each page the person can open, shown by key.
-->
<Header>
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Page>Dashboard</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>
</Header>
