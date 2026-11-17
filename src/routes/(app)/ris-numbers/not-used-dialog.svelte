<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { REASON_MAX, type ListRow, type RisRow } from "./ris-row.js";

  /**
   * Marks a reserved number not used, with the reason, as point 6.5 of
   * "Recording a fuel issuance" asks. A dialog rather than an AlertDialog,
   * because it has a field.
   */
  let {
    open = $bindable(false),
    row = null,
    onMarked,
  }: {
    open: boolean;
    row: ListRow | null;
    onMarked: (row: RisRow) => void;
  } = $props();

  let reason = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) reason = "";
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-105">
    <form
      method="POST"
      action="?/markNotUsed"
      autocomplete="off"
      class="flex flex-col gap-4"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            onMarked(result.data?.updatedRow as RisRow);
            open = false;
          }

          if (result.type === "failure") {
            toastErrorOnce("ris-not-used", "Number not marked", {
              description:
                (result.data as { error?: string } | undefined)?.error ??
                "Try again.",
            });
          }

          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>Mark RIS {row?.shortNumber} not used?</Dialog.Title>
        <Dialog.Description>
          The number stays in the list, and it is never given out again. Reserve
          a new number for the next RIS.
        </Dialog.Description>
      </Dialog.Header>

      <HiddenInput name="id" value={row?.id} />

      <Field.Field>
        <Field.Label for="notUsedReason">Reason</Field.Label>
        <Input
          id="notUsedReason"
          name="reason"
          bind:value={reason}
          placeholder="Paper spoiled"
          maxlength={REASON_MAX}
          required
        />
      </Field.Field>

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
          Mark not used
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
