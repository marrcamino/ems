<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { capitalize } from "@/utils";
  import { Building } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { getGlobalContext } from "../../global-context.svelte.js";

  let { data } = $props();

  const gblCtx = getGlobalContext();

  let mayManage = $derived(gblCtx.can("admin:manage_settings"));
  let submitting = $state(false);

  // What is on file, and what the picker is showing. They are separate so the
  // Save button can tell whether anything was actually changed.
  let saved = $derived(data.gsuUnitPk);
  let gsuUnitPk = $state("");

  // Re-seed the picker whenever the page's data is refreshed, which is what
  // happens after a save and after navigating back to this page.
  $effect(() => {
    const next = saved;
    untrack(() => (gsuUnitPk = next));
  });

  let chosen = $derived(
    data.orgUnits.find(({ orgUnitPk }) => String(orgUnitPk) === gsuUnitPk),
  );
  let changed = $derived(gsuUnitPk !== saved);
</script>

<svelte:head>
  <title>Settings - EMS</title>
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
          <Breadcrumb.Page>Settings</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>
</header>

<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
  <Card.Root class="max-w-2xl">
    <Card.Header>
      <Card.Title>General Services Unit</Card.Title>
      <Card.Description>
        Some printed forms may only be signed by someone from the General
        Services Unit — the GSU Representative on a Withdrawal Slip is one of
        them. Pick the unit here, and only the staff assigned to it will be
        offered on those lines.
      </Card.Description>
    </Card.Header>

    <Card.Content>
      {#if data.orgUnits.length === 0}
        <Empty.Root class="border border-dashed rounded-lg">
          <Empty.Header>
            <Empty.Media variant="icon">
              <Building />
            </Empty.Media>
            <Empty.Title>Nothing to pick from yet</Empty.Title>
            <Empty.Description>
              Add your agency's divisions, sections and units first, then come
              back here.
            </Empty.Description>
          </Empty.Header>
          <Empty.Content>
            <Button href="/admin/org-structure" variant="outline">
              Go to Organizational Structure
            </Button>
          </Empty.Content>
        </Empty.Root>
      {:else}
        <form
          class="grid gap-4"
          method="POST"
          action="?/setGsuUnit"
          autocomplete="off"
          use:enhance={() => {
            submitting = true;
            return async ({ result, update }) => {
              if (result.type === "success") {
                toast.success("Saved");
              }

              if (result.type === "failure") {
                const errorMessage =
                  (result.data as { error?: string } | undefined)?.error ??
                  "Something went wrong.";
                toast.error(errorMessage);
                gsuUnitPk = saved;
              }

              await update({ reset: false });
              submitting = false;
            };
          }}
        >
          <div class="grid gap-2">
            <Label class="flex-col items-start">
              Unit
              <Select.Root
                type="single"
                bind:value={gsuUnitPk}
                disabled={!mayManage}
              >
                <Select.Trigger class="w-full" disabled={!mayManage}>
                  {chosen?.orgUnitName ?? "Not set yet"}
                  <HiddenInput name="orgUnitPk" value={gsuUnitPk} />
                </Select.Trigger>
                <Select.Content>
                  {#each data.orgUnits as { orgUnitPk, orgUnitName, level }}
                    <Select.Item value={String(orgUnitPk)}>
                      {orgUnitName}
                      <span class="text-muted-foreground text-xs">
                        {capitalize(level)}
                      </span>
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </Label>

            {#if !saved}
              <p class="text-sm text-muted-foreground">
                No unit is set. Until one is picked, those lines will have
                nobody to offer.
              </p>
            {/if}
          </div>

          {#if mayManage}
            <div class="flex justify-end">
              <Button type="submit" disabled={!changed || submitting}>
                {#if submitting}
                  <Spinner />
                {/if}
                Save
              </Button>
            </div>
          {/if}
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
