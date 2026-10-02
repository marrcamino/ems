<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { Asset, AssetType } from "@/types";
  import { dataAttr } from "@/utils/index.js";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import { FUEL_TYPE_CHOICES, type AssetRow } from "./asset-row.js";
  import { meterTypePhrase } from "./types/meter-types.js";

  let {
    open = $bindable(false),
    assetToEdit = null,
    assetTypes,
    onSaved,
  }: {
    open: boolean;
    assetToEdit: AssetRow | null;
    /** Every type, active or not; the picker narrows it down itself. */
    assetTypes: AssetType[];
    onSaved: (row: AssetRow, mode: "add" | "edit") => void;
  } = $props();

  const mode = $derived(assetToEdit ? "edit" : "add");

  let assetTypeFk = $state("");
  let assetName = $state("");
  let plateNumber = $state("");
  let propertyNumber = $state("");
  let fuelType = $state<Asset["fuelType"]>("gasoline");
  let active = $state(true);
  let submitting = $state(false);
  let isEditMode = $derived(mode === "edit");

  let typePickerOpen = $state(false);
  let typeTriggerRef = $state<HTMLButtonElement | null>(null);

  function pickType(value: string) {
    assetTypeFk = value;
    typePickerOpen = false;
    // Hand focus back to the trigger so keyboard users stay in the form.
    tick().then(() => typeTriggerRef?.focus());
  }

  /**
   * Active types, plus the one the asset already has even if it has
   * since been switched off. Without that exception the picker would show
   * blank for such an asset, and saving would silently move it elsewhere.
   */
  const pickableTypes = $derived(
    assetTypes.filter(
      (t) =>
        t.status === "active" || t.assetTypePk === assetToEdit?.assetTypeFk,
    ),
  );

  const chosenType = $derived(
    assetTypes.find((t) => String(t.assetTypePk) === assetTypeFk) ?? null,
  );

  // The plate rule follows the meter: a type that reads an odometer runs on
  // the road and carries a plate. The server checks the same thing.
  const plateRequired = $derived(chosenType?.meterType === "odometer");

  /**
   * When adding and only one type is active, it is the only answer, so it is
   * picked already rather than making the admin open a list of one. Only
   * when adding: an asset being edited keeps the type it has.
   */
  function onlyTypeToPick() {
    const active = assetTypes.filter((t) => t.status === "active");
    return active.length === 1 ? String(active[0].assetTypePk) : "";
  }

  /**
   * Seeded when the dialog opens rather than when the row prop changes, so
   * that half-typed edits are not overwritten while the dialog is still up.
   */
  function seed() {
    assetTypeFk = assetToEdit
      ? String(assetToEdit.assetTypeFk)
      : onlyTypeToPick();
    assetName = assetToEdit?.assetName ?? "";
    plateNumber = assetToEdit?.plateNumber ?? "";
    propertyNumber = assetToEdit?.propertyNumber ?? "";
    fuelType = assetToEdit?.fuelType ?? "gasoline";
    active = (assetToEdit?.status ?? "active") === "active";
  }

  $effect(() => {
    if (open) seed();
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="sm:max-w-105 sm:data-editing:max-w-115"
    data-editing={dataAttr(isEditMode)}
  >
    <form
      class="grid gap-5"
      method="POST"
      action={isEditMode ? "?/update" : "?/create"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            const row = (result.data?.newRow ??
              result.data?.updatedRow) as AssetRow;
            onSaved(row, mode);
            toast.success(isEditMode ? "Asset updated" : "Asset added");
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
          {isEditMode ? "Edit asset" : "Add asset"}
        </Dialog.Title>
        <Dialog.Description>
          A vehicle, boat, or machine that the office owns and supplies fuel
          for.
        </Dialog.Description>
      </Dialog.Header>

      {#if assetToEdit}
        <HiddenInput name="assetPk" value={assetToEdit.assetPk} />
      {/if}
      <HiddenInput name="fuelType" value={fuelType} />
      <HiddenInput name="status" value={active ? "active" : "inactive"} />

      <div class="grid gap-1">
        <Label for="assetTypeFk">Asset type</Label>
        <!--
          A searchable list rather than a plain select, the same pattern as
          the one on /admin/test, since the office's list of kinds keeps
          growing and typing a few letters is faster than scrolling.
        -->
        <Popover.Root bind:open={typePickerOpen}>
          <Popover.Trigger
            bind:ref={typeTriggerRef}
            id="assetTypeFk"
            role="combobox"
            aria-expanded={typePickerOpen}
            data-no-value={chosenType ? undefined : ""}
            class="gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm h-8 transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between whitespace-nowrap outline-none data-no-value:text-muted-foreground"
          >
            <span class="min-w-0 flex-1 truncate text-left">
              {chosenType?.assetTypeName ?? "Choose a type"}
            </span>
            <ChevronsUpDownIcon
              class="size-4 shrink-0 text-muted-foreground pointer-events-none"
            />
            <HiddenInput name="assetTypeFk" value={assetTypeFk} required />
          </Popover.Trigger>
          <Popover.Content class="w-(--bits-popover-anchor-width) min-w-48 p-0">
            <Command.Root class="**:data-[slot=input-group]:rounded-sm!">
              <Command.Input placeholder="Search asset types..." />
              <Command.List>
                <Command.Empty>No asset type matches.</Command.Empty>
                <Command.Group class="mt-0.5">
                  {#each pickableTypes as type (type.assetTypePk)}
                    <!-- keywords lets the search match the name, not the id -->
                    <Command.Item
                      value={String(type.assetTypePk)}
                      keywords={[type.assetTypeName]}
                      data-checked={String(type.assetTypePk) === assetTypeFk}
                      onSelect={() => pickType(String(type.assetTypePk))}
                    >
                      {type.assetTypeName}
                      <!--
                        Only ever the asset's current type, kept so editing
                        does not silently change it. Labelled so the admin
                        knows why it is here when others that are off are not.
                      -->
                      {#if type.status === "inactive"}
                        <span class="text-muted-foreground text-xs">
                          (inactive)
                        </span>
                      {/if}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>

      <div class="grid gap-2">
        <Label for="assetName">Name</Label>
        <Input
          id="assetName"
          name="assetName"
          bind:value={assetName}
          placeholder="Toyota Hilux, blue"
          maxlength={100}
          required
        />
      </div>

      <div class="grid gap-2">
        <Label for="plateNumber" class="gap-1">
          Plate number
          {#if !plateRequired}
            <span class="text-muted-foreground font-normal">(if any)</span>
          {/if}
        </Label>
        <Input
          id="plateNumber"
          name="plateNumber"
          bind:value={plateNumber}
          placeholder="SAB 1234"
          maxlength={20}
          required={plateRequired}
        />
      </div>

      <div class="grid gap-2">
        <Label for="propertyNumber">Property number</Label>
        <Input
          id="propertyNumber"
          name="propertyNumber"
          bind:value={propertyNumber}
          placeholder="2019-06-0123"
          maxlength={50}
          required
        />
      </div>

      <fieldset class="grid gap-2">
        <legend class="mb-2 text-sm font-medium">Fuel Type</legend>
        <RadioGroup.Root
          value={fuelType}
          onValueChange={(value) => (fuelType = value as Asset["fuelType"])}
          class="flex gap-2"
        >
          {#each FUEL_TYPE_CHOICES as choice (choice.value)}
            <Label
              for="fuel-{choice.value}"
              data-checked={dataAttr(fuelType === choice.value)}
              class="group/field-label border-input hover:bg-accent/50 data-checked:border-primary font-normal data-checked:bg-accent/40 flex cursor-pointer items-end justify-between gap-3 rounded-lg border p-3 text-left transition-colors w-full "
            >
              {choice.label}
              <RadioGroup.Item value={choice.value} id="fuel-{choice.value}" />
            </Label>
          {/each}
        </RadioGroup.Root>
      </fieldset>

      {#if assetToEdit}
        <div class="gap-4 px-2">
          <Label for="active" class="text-sm font-semibold">Active</Label>
          <div class="flex gap-1">
            <span class="text-muted-foreground text-xs">
              When active, this asset can be picked when recording fuel;
              otherwise, it is hidden from the list.
            </span>
            <Switch id="active" bind:checked={active} class="self-center" />
          </div>
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
          {mode === "edit" ? "Save changes" : "Add asset"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
