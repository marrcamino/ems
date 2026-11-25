<script lang="ts">
  import { enhance } from "$app/forms";
  import DateInput from "$lib/components/date-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import {
    PAPER_SIZES,
    paperSizeLabel,
    type PaperSize,
  } from "$lib/paper-sizes";
  import { formatDate } from "$lib/utils/format-date.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import {
    getLocalTimeZone,
    parseDate,
    today,
    type DateValue,
  } from "@internationalized/date";
  import { toast } from "svelte-sonner";
  import { heldFor, type PaperPoRow } from "./paper-po-types";

  /**
   * Records GSU handing an office some of the paper it holds for it from one
   * PO. What is handed over counts in the office's "New" for that month.
   */
  let {
    open = $bindable(false),
    po,
    office,
  }: {
    open: boolean;
    po: PaperPoRow;
    office: PaperPoRow["distributions"][number] | null;
  } = $props();

  const todayDate = today(getLocalTimeZone());
  const held = $derived(office ? heldFor(office) : {});
  /** Only the sizes GSU still holds some of. */
  const sizes = $derived(
    po.items.map((i) => i.paperSize).filter((size) => (held[size] ?? 0) > 0),
  );

  let handedOn = $state<DateValue | undefined>(undefined);
  // Every size has a value, null for none: the number field cannot bind to
  // a size that is missing.
  const blank = () =>
    Object.fromEntries(PAPER_SIZES.map((s) => [s.value, null])) as Record<
      PaperSize,
      number | null
    >;
  let reams = $state(blank());
  let submitting = $state(false);

  // Starts on today with everything GSU holds, the usual hand-over.
  $effect(() => {
    if (!open) return;
    handedOn = todayDate;
    reams = {
      ...blank(),
      ...Object.fromEntries(sizes.map((s) => [s, held[s] ?? null])),
    };
  });

  const inWords = (r: Partial<Record<PaperSize, number>>) =>
    po.items
      .filter((i) => r[i.paperSize])
      .map((i) => `${r[i.paperSize]} ${paperSizeLabel(i.paperSize)}`)
      .join(", ");
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    {#if office}
      <form
        class="grid gap-5"
        method="POST"
        action="?/handOverPaper"
        autocomplete="off"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              toast.success(`Paper handed over to ${office.abbr}`);
              open = false;
            } else {
              toastErrorOnce("paper-handover", "Hand-over not saved", {
                description:
                  result.type === "failure"
                    ? ((result.data as { error?: string } | undefined)?.error ??
                      "Try again.")
                    : "Try again. If it keeps happening, contact ICT.",
              });
            }
            await update({ reset: false, invalidateAll: true });
            submitting = false;
          };
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Hand over to {office.abbr}</Dialog.Title>
          <Dialog.Description>
            From PO {po.poNumber}. GSU holds {inWords(held)} for
            {office.orgUnitName}.
          </Dialog.Description>
        </Dialog.Header>

        <HiddenInput
          name="paperPurchaseOrderPk"
          value={po.paperPurchaseOrderPk}
        />
        <HiddenInput name="orgUnitFk" value={office.orgUnitPk} />
        <HiddenInput name="handedOn" value={handedOn?.toString() ?? ""} />

        <Field.Field>
          <Field.Label id="handedOn-label" required
            >Date handed over</Field.Label
          >
          <DateInput
            aria-labelledby="handedOn-label"
            bind:value={handedOn}
            minValue={parseDate(po.poDate)}
            maxValue={todayDate}
            required
          />
        </Field.Field>

        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Reams</legend>
          {#each sizes as size (size)}
            <HiddenInput name="reams-{size}" value={reams[size] ?? ""} />
            <div class="grid grid-cols-[4rem_1fr] items-center gap-x-3">
              <span class="text-sm">{paperSizeLabel(size)}</span>
              <InputGroup.Root>
                <NumberInput
                  grouped
                  wholeDigits={4}
                  decimals={0}
                  placeholder="0"
                  bind:value={reams[size]}
                  aria-label="{paperSizeLabel(size)} reams"
                />
                <InputGroup.Addon align="inline-end">
                  of {held[size]} held
                </InputGroup.Addon>
              </InputGroup.Root>
            </div>
          {/each}
        </fieldset>

        {#if office.handovers.length > 0}
          <div class="text-muted-foreground grid gap-1 border-t pt-3 text-sm">
            <span class="text-foreground font-medium">Handed over before</span>
            {#each office.handovers as h (h.handedOn)}
              <span>{formatDate(h.handedOn)}: {inWords(h.reams)}</span>
            {/each}
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
            Hand over
          </Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
