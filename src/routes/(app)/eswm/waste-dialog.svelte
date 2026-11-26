<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import { monthLabel } from "../paper/paper-month";
  import {
    SOURCE_LABEL,
    WASTE_LABEL,
    WASTE_TYPES,
    type BlockKilos,
    type WasteSource,
    type WasteType,
  } from "./eswm-waste";

  let {
    open = $bindable(false),
    source,
    month,
    block,
  }: {
    open: boolean;
    source: WasteSource;
    /** The month on screen, `2026-11`. */
    month: string;
    /** The block's kilos as saved. */
    block: BlockKilos;
  } = $props();

  let kilos = $state<Record<WasteType, number | null>>(emptyKilos());
  let submitting = $state(false);

  /** Every type empty: the number input cannot bind to a missing key. */
  function emptyKilos(): Record<WasteType, number | null> {
    return {
      recyclable: null,
      residual: null,
      non_biodegradable: null,
      biodegradable: null,
      special: null,
    };
  }

  $effect(() => {
    if (open) kilos = { ...emptyKilos(), ...block };
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-120">
    <form
      class="grid gap-5"
      method="POST"
      action="?/save"
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(`${SOURCE_LABEL[source]} saved`);
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("eswm-waste", "Kilos not saved", {
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
        <Dialog.Title>{SOURCE_LABEL[source]}, {monthLabel(month)}</Dialog.Title>
        <Dialog.Description>
          Enter the kilos of each type. Leave a type empty if it was not
          weighed.
        </Dialog.Description>
      </Dialog.Header>

      <HiddenInput name="month" value={month} />
      <HiddenInput name="source" value={source} />

      <div class="grid gap-4">
        {#each WASTE_TYPES[source] as { type, examples } (type)}
          <HiddenInput name={type} value={kilos[type] ?? ""} />
          <div class="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3">
            <div class="grid gap-0.5">
              <Label for="kilos-{type}">{WASTE_LABEL[type]}</Label>
              <!-- The workbook's own examples, so the person sorting knows
                   where each thing goes. -->
              {#if examples}
                <p class="text-muted-foreground text-xs">{examples}</p>
              {/if}
            </div>
            <InputGroup.Root>
              <NumberInput
                grouped
                id="kilos-{type}"
                wholeDigits={6}
                decimals={2}
                padDecimals
                bind:value={kilos[type]}
              />
              <InputGroup.Addon align="inline-end">kg</InputGroup.Addon>
            </InputGroup.Root>
          </div>
        {/each}
      </div>

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
