<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { dataAttr } from "$lib/utils/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { AssetType } from "@/types";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { METER_TYPE_CHOICES, type MeterType } from "./meter-types.js";

  /**
   * The add and edit asset type form. It is a DialogViews view inside the
   * asset types dialog, which slides it in over the list, rather than a
   * dialog of its own on top of that one. The dialog mounts a fresh copy each
   * time it is shown, so the fields are seeded once, here, and never
   * overwritten while the admin types.
   */
  let {
    assetTypeToEdit,
    onSaved,
    onNameClashesWithUnusedType,
    onCancel,
  }: {
    assetTypeToEdit: AssetType | null;
    onSaved: (row: AssetType, mode: "add" | "edit") => void;
    /**
     * Called instead of showing an error when the name clashes with a type
     * that is inactive. That case has an answer worth
     * offering, so the page turns it into a question rather than a dead end.
     */
    onNameClashesWithUnusedType: (row: AssetType) => void;
    onCancel: () => void;
  } = $props();

  const mode = $derived(assetTypeToEdit ? "edit" : "add");
  const isEditMode = $derived(mode === "edit");

  const seed = untrack(() => assetTypeToEdit);
  let assetTypeName = $state(seed?.assetTypeName ?? "");
  let meterType = $state<MeterType>(seed?.meterType ?? "odometer");
  let active = $state((seed?.status ?? "active") === "active");
  let submitting = $state(false);
</script>

<form
  class="flex min-h-0 flex-col gap-4"
  method="POST"
  action={isEditMode ? "?/updateType" : "?/createType"}
  autocomplete="off"
  use:enhance={() => {
    submitting = true;
    return async ({ result, update }) => {
      if (result.type === "success") {
        const row = (result.data?.newRow ??
          result.data?.updatedRow) as AssetType;
        onSaved(row, mode);
        toast.success(isEditMode ? "Asset type updated" : "Asset type added");
      }

      if (result.type === "failure") {
        const data = result.data as
          | { error?: string; noLongerUsed?: AssetType }
          | undefined;

        if (data?.noLongerUsed) {
          onNameClashesWithUnusedType(data.noLongerUsed);
        } else {
          toast.error(data?.error ?? "Something went wrong.");
        }
      }

      await update({ reset: false });
      submitting = false;
    };
  }}
>
  {#if assetTypeToEdit}
    <HiddenInput name="assetTypePk" value={assetTypeToEdit.assetTypePk} />
  {/if}
  <HiddenInput name="meterType" value={meterType} />
  <HiddenInput name="status" value={active ? "active" : "inactive"} />

  <!-- Only the fields scroll, so Cancel and Save stay in reach. -->
  <div class="-mx-4 grid min-h-0 gap-5 overflow-y-auto px-4 pb-1">
    <div class="grid gap-2">
      <Label for="assetTypeName">Name</Label>
      <Input
        data-autofocus
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
      <div class="gap-4 px-2">
        <Label for="active" class="text-sm font-semibold">Active</Label>
        <div class="flex gap-1">
          <span class="text-muted-foreground text-xs">
            When active, this type can be picked when adding an asset;
            otherwise, it is hidden from the list.
          </span>
          <Switch id="active" bind:checked={active} class="self-center" />
        </div>
      </div>
    {/if}
  </div>

  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button
      type="button"
      variant="outline"
      onclick={onCancel}
      disabled={submitting}
    >
      Cancel
    </Button>
    <Button type="submit" disabled={submitting}>
      {#if submitting}
        <Spinner />
      {/if}
      {isEditMode ? "Save changes" : "Add asset type"}
    </Button>
  </div>
</form>
