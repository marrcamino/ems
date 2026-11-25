<script lang="ts">
  import { enhance } from "$app/forms";
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import HiddenInput from "$lib/components/ui/hidden-input.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import {
    WithdrawalForm,
    type WithdrawalData,
  } from "./new-withdrawal-form.svelte.js";
  import type { TransactionDetails } from "./issuance.server";
  import TripTicketStep from "./trip-ticket-step.svelte";

  /**
   * The Trip only form: a trip on the fuel already in the tank, with a trip
   * ticket and no withdrawal slip or RIS ("Which forms apply" in
   * fuel-purchase-orders.md). It is the New withdrawal form's trip ticket
   * step on its own, the same paper, with the office, the file date, and
   * the asset at the top. Saving gives the control and DTT numbers, and the
   * trip starts as Out, since there is no slip for GSU to sign.
   *
   * With `edit`, it opens filled in from a saved trip and saves the changes;
   * the file date and the numbers stay as they are.
   */
  let {
    open = $bindable(false),
    data,
    edit = null,
  }: {
    open: boolean;
    data: WithdrawalData;
    edit?: TransactionDetails | null;
  } = $props();

  const gblCtx = getGlobalContext();
  const form = new WithdrawalForm(
    () => data,
    () => gblCtx.user,
    "trip",
  );

  let submitting = $state(false);

  // Seeded when it opens, so the file date is today's, and again once it has
  // finished closing, so the next open never shows the last trip for a moment.
  $effect(() => {
    if (!open) return;
    form.seed();
    if (edit) form.load(edit);
  });
</script>

<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) form.seed();
  }}
>
  <DialogViews.Content
    view="trip"
    onOpenAutoFocus={(event) => {
      // The first field, not the close button.
      event.preventDefault();
      document
        .getElementById(data.allOffices ? "officePk" : "assetPk")
        ?.focus();
    }}
    data-nested={form.passengersOpen}
  >
    <DialogViews.View
      name="trip"
      title={edit ? "Edit trip" : "Trip only"}
      description={edit
        ? "The control number, the DTT number, and the file date stay the same."
        : "For a trip with enough fuel already in the tank, so only a trip ticket is needed."}
      class="w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] md:w-lg md:max-h-[min(44rem,calc(100dvh-2rem))]"
    >
      <form
        class="flex min-h-0 flex-col gap-4"
        method="POST"
        action={edit ? "?/updateTransaction" : "?/createTrip"}
        autocomplete="off"
        use:enhance={() => {
          form.errors = {};
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === "success") {
              await update();
              open = false;
              toast.success(edit ? "Changes saved" : "Trip saved", {
                description: edit
                  ? `Control number ${result.data?.controlNumber}.`
                  : `Its control number is ${result.data?.controlNumber}.`,
              });
              return;
            }
            if (result.type === "failure") {
              const refusal = result.data as
                { error?: string; field?: string } | undefined;
              const field = refusal?.field;
              if (field && refusal?.error && document.getElementById(field)) {
                form.errors = { [field]: refusal.error };
                await tick();
                document
                  .getElementById(field)
                  ?.scrollIntoView({ block: "center" });
                return;
              }
              toast.error(edit ? "Changes not saved" : "Trip not saved", {
                description: refusal?.error ?? "Try again.",
              });
              return;
            }
            toast.error(edit ? "Changes not saved" : "Trip not saved", {
              description: "Try again. If it keeps happening, contact ICT.",
            });
          };
        }}
      >
        <HiddenInput name="payload" value={form.payload} />
        <ScrollArea
          class="-mx-4 flex min-h-0 flex-col"
          viewPortClasses="h-auto px-4 pb-1 scroll-fade-y"
          type="auto"
        >
          <TripTicketStep {form} />
        </ScrollArea>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            {edit ? "Save changes" : "Save trip"}
          </Button>
        </div>
      </form>
    </DialogViews.View>
  </DialogViews.Content>
</Dialog.Root>
