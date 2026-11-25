<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { paperSizeLabel } from "$lib/paper-sizes";
  import AnimatedList from "$lib/components/transition/animated-list.svelte";
  import NumberInput from "@/components/number-input.svelte";
  import NumberFlow from "@number-flow/svelte";
  import { NUMBER_ROLL } from "$lib/utils/animation.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import {
    ArrowLeft,
    ArrowRight,
    CircleAlert,
    Plus,
    X,
  } from "@lucide/svelte/icons";
  import { tick } from "svelte";
  import SearchPicker, {
    type PickerItem,
  } from "../../fuel/search-picker.svelte";
  import { reamCount } from "../paper-month";
  import type { PaperPoForm } from "./paper-po-form.svelte.js";
  import { MAX_REAMS, type OfficeOption } from "./paper-po-types";

  /**
   * Step 2 of the paper PO dialog: each office's share of each size, GSU
   * included, one row per office. The shares must add up to the PO exactly:
   * every ream is allocated to an office. What GSU keeps of a share in its
   * stock room is the next step.
   */
  let {
    form,
    offices,
    onBack,
    onNext,
  }: {
    form: PaperPoForm;
    offices: OfficeOption[];
    onBack: () => void;
    onNext: () => void;
  } = $props();

  const sizes = $derived(form.sizesOnPo);
  const columns = $derived(
    `minmax(8rem,1fr) repeat(${sizes.length}, 4rem) 2rem`,
  );

  const stepErrors = $derived(
    form.errors.distribution ? [form.errors.distribution] : [],
  );

  let viewport = $state<HTMLElement | null>(null);

  async function addOffice() {
    const id = form.addRow();
    await tick();
    viewport
      ?.querySelector<HTMLElement>(`[data-row-id="${id}"] [role="combobox"]`)
      ?.focus();
  }

  const officeOf = (orgUnitFk: string) =>
    offices.find((o) => String(o.orgUnitPk) === orgUnitFk);

  /** As on the withdrawal slip: the list by short name, the button by name. */
  const officeItems = $derived(
    offices.map((o): PickerItem => ({
      value: String(o.orgUnitPk),
      label: o.abbr,
      detail: o.orgUnitName,
      buttonLabel: o.orgUnitName,
      suffix: `(${o.abbr})`,
    })),
  );
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4">
  <ScrollArea
    bind:viewportRef={viewport}
    class="-mx-4 flex min-h-0 flex-1 flex-col"
    viewPortClasses="h-auto px-4 scroll-fade-y"
    type="auto"
  >
    <div class="grid gap-2 pb-1">
      <div
        class="text-muted-foreground grid items-end gap-x-2 text-xs"
        style:grid-template-columns={columns}
      >
        <span id="distribution-office-label">Division/Section/Unit</span>
        {#each sizes as size (size)}
          <span class="text-right">{paperSizeLabel(size)}</span>
        {/each}
        <span></span>
      </div>

      <!--
        An office added or removed animates in and out, and the list's height
        eases rather than jumping, as on the fuel PO's allocations. Not on
        opening this step: the rows already there appear without it.
      -->
      <AnimatedList items={form.rows} key={(row) => row.id}>
        {#snippet item(row)}
          {@const chosen = officeOf(row.orgUnitFk)}
          {@const taken = form.takenElsewhere(row.id)}
          <div
            data-row-id={row.id}
            class="grid items-center gap-x-2"
            style:grid-template-columns={columns}
          >
            <SearchPicker
              id="office-{row.id}"
              aria-labelledby="distribution-office-label"
              items={officeItems.filter(
                (item) =>
                  item.value === row.orgUnitFk || !taken.has(item.value),
              )}
              bind:value={
                () => row.orgUnitFk,
                (value) => {
                  row.orgUnitFk = value;
                  form.clearError("distribution");
                }
              }
              placeholder="Choose an division/section/unit"
              searchPlaceholder="Search offices..."
              empty="No other office matches."
              class={form.errors.distribution && !row.orgUnitFk
                ? "border-destructive"
                : undefined}
            />
            {#each sizes as size (size)}
              <NumberInput
                class="text-right"
                wholeDigits={String(MAX_REAMS).length}
                decimals={0}
                placeholder="0"
                bind:value={row.reams[size]}
                oninput={() => form.clearError("distribution")}
                aria-label="{chosen?.orgUnitName ?? 'Office'}: {paperSizeLabel(
                  size,
                )} reams"
              />
            {/each}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8"
              onclick={() => form.removeRow(row.id)}
              aria-label="Remove this office"
            >
              <X />
            </Button>
          </div>
        {/snippet}
        {#snippet empty()}
          <p
            class="text-muted-foreground rounded-lg border border-dashed p-3 text-sm"
          >
            No office is allocated paper from this PO yet.
          </p>
        {/snippet}
      </AnimatedList>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={form.rows.length >= offices.length}
          onclick={addOffice}
        >
          <Plus />
          Add office
        </Button>
      </div>

      <!-- What is still to be allocated of each size, under its column. -->
      <div
        class="grid items-center gap-x-2 border-t pt-2 text-sm tabular-nums"
        style:grid-template-columns={columns}
      >
        <span class="text-muted-foreground">Not allocated yet</span>
        {#each sizes as size (size)}
          {@const left = form.left(size)}
          <span
            class={["text-right font-medium", left < 0 && "text-destructive"]}
          >
            <NumberFlow value={left} locales={LOCALE} {...NUMBER_ROLL} />
          </span>
        {/each}
        <span></span>
      </div>
    </div>
  </ScrollArea>

  <div class="-mx-4 grid gap-2.5 border-t px-4 pt-3">
    {#if stepErrors.length > 0}
      <p class="text-destructive flex gap-1.5 text-sm" role="alert">
        <CircleAlert class="mt-0.5 size-4 shrink-0" />
        <span>{stepErrors.join(" ")}</span>
      </p>
    {/if}

    <div class="flex flex-wrap items-center gap-2">
      <span class="w-full text-sm tabular-nums sm:mr-auto sm:w-auto">
        <span class="text-muted-foreground">On the PO</span>
        <span class="font-medium">{reamCount(form.totalReams)}</span>
      </span>
      <Button type="button" variant="outline" onclick={onBack}>
        <ArrowLeft />
        Back
      </Button>
      <Button type="button" class="flex-1 sm:flex-none" onclick={onNext}>
        Next
        <ArrowRight />
      </Button>
    </div>
  </div>
</div>
