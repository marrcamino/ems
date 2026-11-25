<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import { monthLabel } from "../paper/paper-month";
  import type { WaterUse } from "./water-types";

  let {
    open = $bindable(false),
    use = null,
    month,
  }: {
    open: boolean;
    /** The entry to edit, or null to add one. */
    use: WaterUse | null;
    /** The month on screen, `2026-10`, which a new entry belongs to. */
    month: string;
  } = $props();

  const editing = $derived(use !== null);

  let cubicMeters = $state<number | null>(null);
  let note = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) {
      cubicMeters = use?.cubicMeters ?? null;
      note = use?.note ?? "";
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-110">
    <form
      class="grid gap-5"
      method="POST"
      action={editing ? "?/edit" : "?/add"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(editing ? "Entry updated" : "Entry added");
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("water-use", "Entry not saved", {
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
        <Dialog.Title>
          {editing ? "Edit water use" : "Add water use"}
        </Dialog.Title>
        <Dialog.Description>
          {editing
            ? `Correct this entry for ${monthLabel(month)}.`
            : `Record the water that the office used in ${monthLabel(month)}.`}
        </Dialog.Description>
      </Dialog.Header>

      {#if use}
        <HiddenInput name="usePk" value={use.usePk} />
      {/if}
      <HiddenInput name="month" value={month} />
      <HiddenInput name="cubicMeters" value={cubicMeters ?? ""} />

      <div class="grid gap-2">
        <Label for="cubicMeters" required>Cubic meters</Label>
        <InputGroup.Root>
          <NumberInput
            grouped
            id="cubicMeters"
            wholeDigits={7}
            decimals={0}
            placeholder="0"
            bind:value={cubicMeters}
            required
          />
          <InputGroup.Addon align="inline-end">m³</InputGroup.Addon>
        </InputGroup.Root>
      </div>

      <div class="grid gap-2">
        <Label for="note">Note</Label>
        <Input
          id="note"
          name="note"
          bind:value={note}
          maxlength={200}
          placeholder="For example, the water bill, or which meter"
        />
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
          {editing ? "Save changes" : "Add water use"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
