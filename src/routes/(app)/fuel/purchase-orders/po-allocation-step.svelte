<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import {
    ArrowLeft,
    CircleAlert,
    CircleCheck,
    Plus,
  } from "@lucide/svelte/icons";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import {
    DETAIL_FIELDS,
    type AddPurchaseOrderForm,
  } from "./add-po-form.svelte.js";
  import AnimatedList from "$lib/components/transition/animated-list.svelte";
  import AllocationRow from "./allocation-row.svelte";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { FUEL_LABELS, type Fuel } from "./po-math.js";
  import type { PurchaseOrderRow, UnitOption } from "./po-types.js";

  /**
   * Step 2 of the add PO dialog: each fuel on the PO allocated to the
   * divisions, sections or units, and the whole PO sent to the server.
   *
   * Each fuel is a section: its target (liters × unit cost = amount), a
   * progress bar, a status line with Add unit, then one row per allocation.
   * The status stays plain while the user is still typing, and turns red
   * only when a fuel is over the PO or after a refused Save. The refused
   * Save's message sits in the footer beside the Save button.
   */
  let {
    form,
    unitOptions,
    submitting = $bindable(false),
    editing = false,
    onBack,
    onSaved,
    onDetailsRefused,
  }: {
    form: AddPurchaseOrderForm;
    /** The active divisions, sections, units and offices, in level order. */
    unitOptions: UnitOption[];
    /** Read by the dialog, which shows a spinner in the stepper meanwhile. */
    submitting?: boolean;
    /** Opened from a PO's Edit button: Save updates that PO rather than adding one. */
    editing?: boolean;
    onBack: () => void;
    onSaved: (row: PurchaseOrderRow) => void;
    /**
     * The server refused the PO number, date or supplier, which are fixed
     * on the details step, so the dialog goes back there.
     */
    onDetailsRefused: () => void;
  } = $props();

  const errors = $derived(form.errors);

  /** The messages for this step, shown together in the footer. */
  const stepErrors = $derived(
    Object.entries(errors)
      .filter(([field]) => !DETAIL_FIELDS.includes(field))
      .map(([, message]) => message),
  );

  const allUnitsUsed = (fuel: Fuel) =>
    form.allocations[fuel].length >= unitOptions.length;

  /** The scrolling list, so a row or a fuel can be scrolled into view. */
  let viewport = $state<HTMLElement | null>(null);

  function scrollToTop(el: Element) {
    if (!viewport) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top =
      viewport.scrollTop +
      el.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top;
    viewport.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }

  function scrollUntilVisible(el: Element) {
    if (!viewport) return;
    const below =
      el.getBoundingClientRect().bottom -
      viewport.getBoundingClientRect().bottom;
    if (below > 0) viewport.scrollTop += below + 16;
  }

  /**
   * Adds an allocation (prefilled with what is left) and puts the cursor in
   * its unit picker, since picking the unit is the next thing to do.
   */
  async function addUnit(fuel: Fuel) {
    const id = form.addAllocation(fuel);
    await tick();
    const row = viewport?.querySelector(`[data-allocation-id="${id}"]`);
    if (!row) return;
    row
      .querySelector<HTMLElement>('[data-slot="select-trigger"]')
      ?.focus({ preventScroll: true });
    scrollUntilVisible(row);
  }

  /** After a refused Save: bring the first fuel with a problem into view. */
  async function showFirstProblem() {
    const fuel = form.fuelsOnPo.find((f) => form.errors[f]);
    if (!fuel) return;
    await tick();
    const section = viewport?.querySelector(`[data-fuel="${fuel}"]`);
    if (section) scrollToTop(section);
  }
</script>

{#snippet fuelHeader(fuel: Fuel)}
  {@const targetH = form.litersH(fuel)}
  {@const allocatedH = form.allocatedH(fuel)}
  {@const left = targetH - allocatedH}
  {@const alert = left < 0 || (left > 0 && !!errors[fuel])}
  <div class="grid gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 class="font-medium">{FUEL_LABELS[fuel]}</h3>
      <span class="text-muted-foreground text-xs tabular-nums">
        {formatLiters(targetH)} × {formatPesos(form.unitCostC(fuel))}/L =
        {formatPesos(form.amountC(fuel))}
      </span>
    </div>

    <!-- The status line below says the same in words, so this is hidden. -->
    <div class="bg-muted h-1 overflow-hidden rounded-full" aria-hidden="true">
      <div
        class={[
          "h-full origin-left transition-[transform,background-color] duration-200 ease-out",
          alert ? "bg-destructive" : "bg-foreground",
        ]}
        style:transform="scaleX({left < 0
          ? 1
          : Math.min(allocatedH / targetH, 1)})"
      ></div>
    </div>

    <div class="flex min-h-8 items-center justify-between gap-2">
      <p
        class={[
          "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums",
          alert && "text-destructive",
        ]}
        aria-live="polite"
      >
        {#if left === 0}
          <CircleCheck class="size-3.5 shrink-0" />
          <span class="font-medium">All {formatLiters(targetH)} allocated</span>
        {:else}
          {#if alert}
            <CircleAlert class="size-3.5 shrink-0" />
          {/if}
          <span class="font-medium">
            {left > 0
              ? `${formatLiters(left)} left to allocate`
              : `${formatLiters(-left)} over the PO`}
          </span>
          <span class={alert ? undefined : "text-muted-foreground"}>
            &bull;
          </span>
          <span class={alert ? undefined : "text-muted-foreground"}>
            {formatLiters(allocatedH)} of {formatLiters(targetH)}
          </span>
        {/if}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="shrink-0"
        disabled={allUnitsUsed(fuel)}
        onclick={() => addUnit(fuel)}
      >
        <Plus />
        Add unit
      </Button>
    </div>
  </div>
{/snippet}

<form
  class="flex min-h-0 flex-col gap-4"
  method="POST"
  action={editing ? "?/updatePurchaseOrder" : "?/createPurchaseOrder"}
  novalidate
  autocomplete="off"
  use:enhance={({ cancel }) => {
    form.errors = form.allocationErrors();
    if (Object.keys(form.errors).length > 0) {
      cancel();
      showFirstProblem();
      return;
    }

    submitting = true;
    return async ({ result }) => {
      submitting = false;

      if (result.type === "success") {
        const row = result.data?.newRow as PurchaseOrderRow;
        toast.success(`PO ${row.poNumber} ${editing ? "saved" : "added"}`);
        onSaved(row);
        return;
      }

      if (result.type === "failure") {
        const data = result.data as
          | { error?: string; field?: string }
          | undefined;
        if (data?.field && data.error) {
          form.errors[data.field] = data.error;
          if (DETAIL_FIELDS.includes(data.field)) onDetailsRefused();
          else showFirstProblem();
          return;
        }
        toast.error(editing ? "Changes not saved" : "Purchase order not added", {
          description: data?.error ?? "Try again.",
        });
        return;
      }

      toast.error(editing ? "Changes not saved" : "Purchase order not added", {
        description: "Try again. If it keeps happening, contact ICT.",
      });
    };
  }}
>
  <HiddenInput name="payload" value={form.payload} />

  <!-- Only the allocations scroll, so Back and Save stay in reach. -->
  <ScrollArea
    bind:viewportRef={viewport}
    class="-mx-4 flex min-h-0 flex-col"
    viewPortClasses="h-auto px-4 scroll-fade-y"
    type="auto"
  >
    <!-- A container, so each row lays itself out from the list's width. -->
    <div class="@container grid gap-4 pb-1">
      {#each form.fuelsOnPo as fuel (fuel)}
        <section
          data-fuel={fuel}
          class="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0"
          aria-label="{FUEL_LABELS[fuel]} allocations"
        >
          {@render fuelHeader(fuel)}

          <!--
            Added and removed allocations animate in and out, and the list's
            height eases rather than jumping. Not on entering this step: the
            first rows appear without it. Below a list width of 24rem, where
            each row takes two lines, a thin line separates the allocations;
            it is drawn here, on the list, because each row sits in its own
            wrapper and cannot tell that it is the last one.
          -->
          <AnimatedList
            items={form.allocations[fuel]}
            key={(allocation) => allocation.id}
            listClass="gap-2.5 *:not-last:border-b *:not-last:pb-2.5 @sm:gap-2 @sm:*:not-last:border-b-0 @sm:*:not-last:pb-0"
          >
            {#snippet item(allocation)}
              <AllocationRow
                {allocation}
                {unitOptions}
                taken={form.takenElsewhere(fuel, allocation.id)}
                unitCostC={form.unitCostC(fuel)}
                fuelLabel={FUEL_LABELS[fuel]}
                removable={form.allocations[fuel].length > 1}
                showErrors={!!errors[fuel]}
                onPickUnit={(value) => form.pickUnit(fuel, allocation, value)}
                onRemove={() => form.removeAllocation(fuel, allocation.id)}
                onchange={() => form.clearError(fuel)}
              />
            {/snippet}
          </AnimatedList>
        </section>
      {/each}

      <Field.Field class="border-t pt-4">
        <Field.Label for="poNote">
          Basis for the allocation
          <span class="text-muted-foreground font-normal">(optional)</span>
        </Field.Label>
        <Textarea
          id="poNote"
          bind:value={form.note}
          rows={2}
          maxlength={255}
          placeholder="Memo 2026-045, or as agreed on 7 Oct"
        />
      </Field.Field>
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
        <span class="text-muted-foreground">Total</span>
        <span class="font-medium">{formatPesos(form.totalC)}</span>
      </span>

      <Button
        type="button"
        variant="outline"
        onclick={onBack}
        disabled={submitting}
      >
        <ArrowLeft />
        Back
      </Button>

      <Button type="submit" class="flex-1 sm:flex-none" disabled={submitting}>
        {#if submitting}
          <Spinner />
        {/if}
        {editing ? "Save changes" : "Save purchase order"}
      </Button>
    </div>
  </div>
</form>
