<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { PAPER_SIZES, type PaperSize } from "$lib/paper-sizes";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import { addMonths, monthLabel } from "./paper-month";
  import type { PaperStart } from "./paper-types";

  /**
   * The office's first month in EMS starts from the paper it already had:
   * the Balance row of its last paper form, typed here once.
   */
  let {
    open = $bindable(false),
    month,
    start,
  }: {
    open: boolean;
    /** The month on screen, `2026-10`, which becomes the first month. */
    month: string;
    /** What was entered before, to correct it. */
    start: PaperStart | null;
  } = $props();

  let reams = $state<Record<PaperSize, number | null>>(
    Object.fromEntries(PAPER_SIZES.map((s) => [s.value, null])) as Record<
      PaperSize,
      number | null
    >,
  );
  let submitting = $state(false);

  $effect(() => {
    if (!open) return;
    for (const size of PAPER_SIZES) {
      reams[size.value] = start?.reams[size.value] || null;
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-105">
    <form
      class="grid gap-5"
      method="POST"
      action="?/setStartingBalance"
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success("Balance forwarded saved");
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("paper-start", "Balance forwarded not saved", {
              description:
                (result.data as { error?: string } | undefined)?.error ??
                "Try again.",
            });
          }
          await update({ reset: false, invalidateAll: true });
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>Balance forwarded</Dialog.Title>
        <Dialog.Description>
          The reams your office had left at the end of {monthLabel(
            addMonths(month, -1),
          )}, from the Balance row of its paper form.
        </Dialog.Description>
      </Dialog.Header>

      <HiddenInput name="month" value={month} />

      <fieldset class="grid gap-2">
        <legend class="sr-only">Reams of each size</legend>
        {#each PAPER_SIZES as size (size.value)}
          <HiddenInput
            name="reams-{size.value}"
            value={reams[size.value] ?? ""}
          />
          <div class="grid grid-cols-[4rem_1fr_7rem] items-center gap-x-3">
            <span class="text-sm">{size.label}</span>
            <span class="text-muted-foreground text-xs">{size.measure}</span>
            <InputGroup.Root>
              <NumberInput
                grouped
                wholeDigits={4}
                decimals={0}
                placeholder="0"
                bind:value={reams[size.value]}
                aria-label="{size.label} reams"
              />
              <InputGroup.Addon align="inline-end">reams</InputGroup.Addon>
            </InputGroup.Root>
          </div>
        {/each}
      </fieldset>

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
          Save
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
