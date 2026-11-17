<script lang="ts">
  import { enhance } from "$app/forms";
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import { copyText } from "$lib/utils/clipboard.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { Copy } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import {
    PURPOSE_MAX,
    type ListRow,
    type Reusable,
    type RisRow,
  } from "./ris-row.js";

  /**
   * Reserves the next RIS number, or edits what a reserved one is for. After
   * a reservation the dialog slides to the number, large, so it can be
   * carried to the paper.
   */
  let {
    open = $bindable(false),
    reservationToEdit = null,
    reusable,
    onSaved,
  }: {
    open: boolean;
    reservationToEdit: ListRow | null;
    /** The not-used number offered first, when the newest number is one. */
    reusable: Reusable | null;
    onSaved: (
      row: RisRow,
      mode: "add" | "edit",
      reusedId: number | null,
    ) => void;
  } = $props();

  const isEditMode = $derived(reservationToEdit !== null);

  let purpose = $state("");
  let submitting = $state(false);
  let reserved = $state<string | null>(null);
  let view = $state<"form" | "number">("form");
  let take = $state<"again" | "new">("again");

  // Offered only when adding, and only while the newest number is not used.
  const offer = $derived(isEditMode ? null : reusable);

  // Seeded when the dialog opens, so half-typed text is not overwritten
  // while the dialog is still up.
  $effect(() => {
    if (!open) return;
    purpose = reservationToEdit?.purpose ?? "";
    take = "again";
  });

  function onOpenChangeComplete(isOpen: boolean) {
    if (isOpen) return;
    view = "form";
    reserved = null;
  }

  async function copy() {
    if (!reserved) return;
    if (await copyText(reserved)) toast.success("Number copied");
    else {
      toast.error("Number not copied", {
        description: "Select the number and copy it by hand.",
      });
    }
  }
</script>

<Dialog.Root bind:open {onOpenChangeComplete}>
  <DialogViews.Content {view}>
    <DialogViews.View
      name="form"
      title={isEditMode
        ? `Edit RIS ${reservationToEdit?.shortNumber}`
        : "Reserve the next RIS number"}
      description={isEditMode
        ? undefined
        : "EMS gives the number when you save, so that nobody else takes it in the meantime."}
    >
      <form
        method="POST"
        action={isEditMode ? "?/update" : "?/reserve"}
        autocomplete="off"
        class="flex flex-col gap-4"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              const row = (result.data?.newRow ??
                result.data?.updatedRow) as RisRow;
              onSaved(
                row,
                isEditMode ? "edit" : "add",
                (result.data?.reusedId as number | null) ?? null,
              );
              if (isEditMode) {
                toast.success(`RIS ${reservationToEdit?.shortNumber} updated`);
                open = false;
              } else {
                reserved = row.risNumber;
                view = "number";
              }
            }

            if (result.type === "failure") {
              toastErrorOnce(
                "ris-save",
                isEditMode ? "Changes not saved" : "Number not reserved",
                {
                  description:
                    (result.data as { error?: string } | undefined)?.error ??
                    "Try again.",
                },
              );
            }

            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        {#if reservationToEdit}
          <HiddenInput name="id" value={reservationToEdit.id} />
        {/if}

        <Field.Field>
          <Field.Label for="purpose">What it is for</Field.Label>
          <Input
            id="purpose"
            name="purpose"
            bind:value={purpose}
            placeholder="Bond paper, 10 reams for Records"
            maxlength={PURPOSE_MAX}
            required
            data-autofocus
          />
        </Field.Field>

        {#if offer}
          <HiddenInput name="reuse" value={String(take === "again")} />
          <fieldset class="grid gap-2">
            <legend class="mb-2 text-sm font-medium">Number</legend>
            <RadioGroup.Root
              value={take}
              onValueChange={(value) => (take = value as "again" | "new")}
              class="grid gap-3"
            >
              <div class="flex items-start gap-2">
                <RadioGroup.Item value="again" id="take-again" class="mt-0.5" />
                <Label for="take-again" class="grid gap-0.5 font-normal">
                  <span class="font-medium">Use {offer.again} again</span>
                  <span class="text-muted-foreground text-xs">
                    {offer.reason
                      ? `It was marked not used: ${offer.reason}`
                      : "It was marked not used."}
                  </span>
                </Label>
              </div>
              <div class="flex items-start gap-2">
                <RadioGroup.Item value="new" id="take-new" class="mt-0.5" />
                <Label for="take-new" class="font-medium">
                  Take a new number, {offer.instead}
                </Label>
              </div>
            </RadioGroup.Root>
          </fieldset>
        {/if}

        <div class="flex justify-end gap-2">
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
            {isEditMode ? "Save changes" : "Reserve"}
          </Button>
        </div>
      </form>
    </DialogViews.View>

    <DialogViews.View
      name="number"
      title="RIS number reserved"
      description="Write this number on the RIS."
    >
      <p class="py-2 text-center text-4xl font-semibold tabular-nums">
        {reserved}
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" onclick={copy}>
          <Copy />
          Copy number
        </Button>
        <Button onclick={() => (open = false)} data-autofocus>Close</Button>
      </div>
    </DialogViews.View>
  </DialogViews.Content>
</Dialog.Root>
