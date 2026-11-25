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
  import type { ElectricityUse } from "./electricity-types";

  let {
    open = $bindable(false),
    use = null,
    month,
  }: {
    open: boolean;
    /** The entry to edit, or null to add one. */
    use: ElectricityUse | null;
    /** The month on screen, `2026-10`, which a new entry belongs to. */
    month: string;
  } = $props();

  const editing = $derived(use !== null);

  let kwh = $state<number | null>(null);
  let note = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) {
      kwh = use?.kwh ?? null;
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
            toastErrorOnce("electricity-use", "Entry not saved", {
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
          {editing ? "Edit electricity use" : "Add electricity use"}
        </Dialog.Title>
        <Dialog.Description>
          {editing
            ? `Correct this entry for ${monthLabel(month)}.`
            : `Record the electricity that the office used in ${monthLabel(month)}.`}
        </Dialog.Description>
      </Dialog.Header>

      {#if use}
        <HiddenInput name="usePk" value={use.usePk} />
      {/if}
      <HiddenInput name="month" value={month} />
      <HiddenInput name="kwh" value={kwh ?? ""} />

      <div class="grid gap-2">
        <Label for="kwh" required>Kilowatt-hours</Label>
        <InputGroup.Root>
          <NumberInput
            grouped
            id="kwh"
            wholeDigits={7}
            decimals={0}
            placeholder="0"
            bind:value={kwh}
            required
          />
          <InputGroup.Addon align="inline-end">kWh</InputGroup.Addon>
        </InputGroup.Root>
      </div>

      <div class="grid gap-2">
        <Label for="note">Note</Label>
        <Input
          id="note"
          name="note"
          bind:value={note}
          maxlength={200}
          placeholder="For example, the DIELCO bill, or which meter"
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
          {editing ? "Save changes" : "Add electricity use"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
