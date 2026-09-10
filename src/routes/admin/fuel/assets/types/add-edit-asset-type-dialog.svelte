<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { AssetType } from "@/types";
  import { dataAttr } from "$lib/utils/index.js";
  import { toast } from "svelte-sonner";
  import { METER_TYPE_CHOICES, type MeterType } from "./meter-types.js";
  import { untrack } from "svelte";

  let {
    open = $bindable(false),
    assetTypeToEdit = null,
    onSaved,
  }: {
    open: boolean;
    assetTypeToEdit: AssetType | null;
    onSaved: (row: AssetType, mode: "add" | "edit") => void;
  } = $props();

  const mode = $derived(assetTypeToEdit ? "edit" : "add");

  let assetTypeName = $state("");
  let meterType = $state<MeterType>("odometer");
  let active = $state(true);
  let submitting = $state(false);

  /**
   * Seeded when the dialog opens rather than when the row prop changes, so
   * that half-typed edits are not overwritten while the dialog is still up.
   */
  function seed() {
    assetTypeName = assetTypeToEdit?.assetTypeName ?? "";
    meterType = assetTypeToEdit?.meterType ?? "odometer";
    active = (assetTypeToEdit?.status ?? "active") === "active";
  }

  $effect(() => {
    if (open) seed();
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-105">
    <form
      class="grid gap-5"
      method="POST"
      action={mode === "edit" ? "?/update" : "?/create"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            const row = (result.data?.newRow ??
              result.data?.updatedRow) as AssetType;
            onSaved(row, mode);
            toast.success(
              mode === "edit" ? "Asset type updated" : "Asset type added",
            );
            open = false;
          }

          if (result.type === "failure") {
            toast.error(
              (result.data as { error?: string } | undefined)?.error ??
                "Something went wrong.",
            );
          }

          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {mode === "edit" ? "Edit asset type" : "Add asset type"}
        </Dialog.Title>
        <Dialog.Description>
          A type of machine that the office supplies fuel for, such as a pickup
          truck, motorcycle, generator, etc.
        </Dialog.Description>
      </Dialog.Header>

      {#if assetTypeToEdit}
        <HiddenInput name="assetTypePk" value={assetTypeToEdit.assetTypePk} />
      {/if}
      <HiddenInput name="meterType" value={meterType} />
      <HiddenInput name="status" value={active ? "active" : "inactive"} />

      <div class="grid gap-2">
        <Label for="assetTypeName">Name</Label>
        <Input
          id="assetTypeName"
          name="assetTypeName"
          bind:value={assetTypeName}
          placeholder="Motorcycle"
          maxlength={100}
          required
        />
      </div>

      <fieldset class="grid gap-2">
        <legend class="mb-2 text-sm font-medium">
          What meter does this kind of machine have on it?
        </legend>
        <!--
          `value` plus `onValueChange` rather than `bind:value`, because the
          group's value is a plain string while `meterType` is the narrower
          union of the three meters — binding would have to assign a string
          straight into it.
        -->
        <RadioGroup.Root
          value={meterType}
          onValueChange={(value) => (meterType = value as MeterType)}
        >
          {#each METER_TYPE_CHOICES as choice (choice.value)}
            <!--
              `group/field-label` is what the radio button's own styles look
              for to show a focus ring on the whole row, so the label keeps
              that name even though the Field components are not used here.
            -->
            <label
              for="meter-{choice.value}"
              data-checked={dataAttr(meterType === choice.value)}
              class="group/field-label border-input hover:bg-accent/50 data-checked:border-primary data-checked:bg-accent/40 flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <span class="grid gap-0.5">
                <span class="block text-sm font-semibold">{choice.label}</span>
                <span class="text-muted-foreground block text-xs">
                  {choice.description}
                </span>
              </span>
              <RadioGroup.Item
                value={choice.value}
                id="meter-{choice.value}"
                class="mt-0.5"
              />
            </label>
          {/each}
        </RadioGroup.Root>
      </fieldset>

      {#if assetTypeToEdit}
        <div
          class="flex items-start justify-between gap-4 rounded-lg border p-3"
        >
          <div class="grid gap-0.5">
            <Label for="active" class="text-sm font-semibold">In use</Label>
            <span class="text-muted-foreground text-xs">
              Turn this off if the office no longer has this kind of machine.
              Assets already saved under it stay as they are, but you can no
              longer pick it when adding a new asset.
            </span>
          </div>
          <Switch id="active" bind:checked={active} />
        </div>
      {/if}

      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {#if submitting}
            <Spinner />
          {/if}
          {mode === "edit" ? "Save changes" : "Add asset type"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
