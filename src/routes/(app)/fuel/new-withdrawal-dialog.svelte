<script lang="ts">
  import { enhance } from "$app/forms";
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import * as Stepper from "$lib/components/stepper/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import HiddenInput from "$lib/components/ui/hidden-input.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { ArrowLeft, ArrowRight } from "@lucide/svelte/icons";
  import { tick, untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { MediaQuery } from "svelte/reactivity";
  import {
    STEP_FIELDS,
    TRANSACTION_FIELDS,
    WithdrawalForm,
    type Step,
    type WithdrawalData,
  } from "./new-withdrawal-form.svelte.js";
  import type { TransactionDetails } from "./issuance.server";
  import RisStep from "./ris-step.svelte";
  import TripTicketStep from "./trip-ticket-step.svelte";
  import WithdrawalSlipStep from "./withdrawal-slip-step.svelte";

  /**
   * The New withdrawal form: what is typed when a withdrawal is requested,
   * one step for each printed form. The withdrawal slip first, with the fuel
   * and the PO, then the RIS, then the trip ticket when the asset has one.
   * The supplier's numbers and the trip ticket's lines after the trip come
   * later, in the Complete step. Saving gives the control, WS, RIS, and DTT
   * numbers, and the list reloads with the new row.
   *
   * What is typed lives in `form` (new-withdrawal-form.svelte.ts), which the
   * three steps share; this file is the dialog around them.
   *
   * With `kind="reimbursed"` it is the Reimbursed trip form: the RIS and the
   * trip ticket, with no withdrawal slip, since the driver pays for the fuel
   * and the office pays it back. Its RIS step starts with the office, the
   * file date, and the asset, and its trip ticket asks for the litres bought.
   *
   * With `edit`, it opens filled in from a saved transaction of its kind, and
   * saves the changes; the file date and the numbers stay as they are.
   */
  let {
    open = $bindable(false),
    data,
    kind = "withdrawal",
    edit = null,
  }: {
    open: boolean;
    data: WithdrawalData;
    /** Set once; the form does not switch kinds while it is shown. */
    kind?: "withdrawal" | "reimbursed";
    edit?: TransactionDetails | null;
  } = $props();

  const gblCtx = getGlobalContext();
  const reimbursed = untrack(() => kind) === "reimbursed";
  const form = new WithdrawalForm(
    () => data,
    () => gblCtx.user,
    reimbursed ? "reimbursed" : "withdrawal",
  );

  const NEW_TEXT = reimbursed
    ? {
        title: "Reimbursed trip",
        description:
          "For a trip where the driver pays for the fuel and the office pays it back.",
        action: "?/createReimbursedTrip",
        save: "Save trip",
        saved: "Trip saved",
        notSaved: "Trip not saved",
      }
    : {
        title: "New withdrawal",
        description:
          "One step for each printed form. EMS gives the control, WS, RIS, and DTT numbers when the withdrawal is saved.",
        action: "?/createWithdrawal",
        save: "Save withdrawal",
        saved: "Withdrawal saved",
        notSaved: "Withdrawal not saved",
      };
  const TEXT = $derived(
    edit
      ? {
          title: reimbursed ? "Edit reimbursed trip" : "Edit withdrawal",
          description:
            "The control number, the form numbers, and the file date stay the same.",
          action: "?/updateTransaction",
          save: "Save changes",
          saved: "Changes saved",
          notSaved: "Changes not saved",
        }
      : NEW_TEXT,
  );

  let submitting = $state(false);

  type StepInfo = { name: Step; label: string; hint: string; title: string };
  const STEPS: StepInfo[] = [
    {
      name: "slip",
      label: "Withdrawal slip",
      hint: "The fuel and the PO",
      title: "Withdrawal slip",
    },
    {
      name: "ris",
      label: "RIS",
      hint: reimbursed
        ? "The asset and the signatories"
        : "Purpose and signatories",
      title: "Requisition and Issue Slip",
    },
    {
      name: "dtt",
      label: "Trip ticket",
      hint: reimbursed
        ? "Driver, travel, and fuel bought"
        : "Driver and travel",
      title: "Driver's Trip Ticket",
    },
  ];
  const firstStep: Step = reimbursed ? "ris" : "slip";
  let view = $state<Step>(firstStep);
  // The trip ticket is the last step, so it can come and go with the asset:
  // the steps before it keep their numbers. A reimbursed trip has no slip,
  // and always a trip ticket, since only assets with one are offered.
  const steps = $derived(
    reimbursed
      ? STEPS.filter((s) => s.name !== "slip")
      : form.hasTripTicket
        ? STEPS
        : STEPS.filter((s) => s.name !== "dtt"),
  );
  const stepIndex = $derived(steps.findIndex((s) => s.name === view));
  const lastStep = $derived(steps.at(-1)?.name);

  /** The fields on a step; the first step also holds the office and the asset. */
  const fieldsOf = (step: Step) =>
    step === firstStep
      ? [...TRANSACTION_FIELDS, ...STEP_FIELDS[step]]
      : STEP_FIELDS[step];

  const stepHasError = (step: Step) =>
    fieldsOf(step).some((field) => form.errors[field]);

  // Seeded again once the dialog has finished closing, so the next open
  // starts clean instead of showing the last form (and its warning) for a
  // moment. Also when it opens, so the file date is today's.
  function reset() {
    view = firstStep;
    form.seed();
  }

  $effect(() => {
    if (!open) return;
    reset();
    if (edit) form.load(edit);
  });

  /** Tailwind's `md`: at this width and up the stepper runs down the side. */
  const wide = new MediaQuery("min-width: 768px");

  // Only a done step can be clicked in the stepper, so this only goes back.
  function goToStep(index: number) {
    const step = steps[index];
    if (step) view = step.name;
  }

  function back() {
    if (stepIndex > 0) view = steps[stepIndex - 1].name;
  }

  let saveForm = $state<HTMLFormElement | null>(null);

  /**
   * Each step is its own form, so the browser checks only that step's fields
   * before Next. The last step saves through `saveForm`, which sends what all
   * the steps hold.
   */
  function submitStep(event: SubmitEvent) {
    event.preventDefault();
    if (view === lastStep) saveForm?.requestSubmit();
    else view = steps[stepIndex + 1].name;
  }

  // Below `md` the stepper sits above the step, and its height depends on how
  // its names wrap, so the step leaves room for what it really measures.
  let sidebarHeight = $state(0);
  const VIEW_CLASS =
    "md:w-lg w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem-var(--sidebar-height))] md:max-w-[calc(100vw-14rem)] md:max-h-[min(44rem,calc(100dvh-2rem))]";
</script>

<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) reset();
  }}
>
  <!-- Escape on a later step goes back a step, rather than closing. -->
  <DialogViews.Content
    {view}
    title={TEXT.title}
    description={TEXT.description}
    onBack={back}
    onOpenAutoFocus={(event) => {
      // The first field, not the first button, which is in the stepper.
      event.preventDefault();
      document
        .getElementById(data.allOffices ? "officePk" : "assetPk")
        ?.focus();
    }}
    showCloseButton={view === firstStep}
    data-nested={form.passengersOpen}
    style="--sidebar-height: {sidebarHeight}px"
  >
    {#snippet sidebar()}
      <aside
        bind:offsetHeight={sidebarHeight}
        class="bg-muted/40 flex shrink-0 flex-col border-b p-4 md:w-48 md:border-r md:border-b-0"
      >
        <!-- The dialog's title, as seen; screen readers get it from Content. -->
        <p
          class="pr-8 text-base leading-none font-medium md:pr-0"
          aria-hidden="true"
        >
          {TEXT.title}
        </p>
        <Stepper.Root
          bind:current={() => stepIndex, (index) => goToStep(index)}
          orientation={wide.current ? "vertical" : "horizontal"}
          class="mt-5"
        >
          {#each steps as step (step.name)}
            <Stepper.Item
              error={stepHasError(step.name)}
              loading={step.name === lastStep && submitting}
              disabled={submitting}
            >
              <Stepper.Header>
                <Stepper.Title>{step.label}</Stepper.Title>
                <Stepper.Description class="hidden md:block">
                  {step.hint}
                </Stepper.Description>
              </Stepper.Header>
            </Stepper.Item>
          {/each}
        </Stepper.Root>
      </aside>
    {/snippet}

    {#each steps as step (step.name)}
      <DialogViews.View name={step.name} title={step.title} class={VIEW_CLASS}>
        <form
          class="flex min-h-0 flex-col gap-4"
          autocomplete="off"
          onsubmit={submitStep}
        >
          <ScrollArea
            class="-mx-4 flex min-h-0 flex-col"
            viewPortClasses="h-auto px-4 pb-1 scroll-fade-y"
            type="auto"
          >
            {#if step.name === "slip"}
              <WithdrawalSlipStep {form} />
            {:else if step.name === "ris"}
              <RisStep {form} />
            {:else}
              <TripTicketStep {form} />
            {/if}
          </ScrollArea>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {#if step.name === firstStep}
              <Button
                type="button"
                variant="outline"
                onclick={() => (open = false)}
              >
                Cancel
              </Button>
            {:else}
              <Button
                type="button"
                variant="outline"
                onclick={back}
                disabled={submitting}
              >
                <ArrowLeft />
                Back
              </Button>
            {/if}
            {#if step.name === lastStep}
              <Button type="submit" disabled={submitting}>
                {#if submitting}
                  <Spinner />
                {/if}
                {TEXT.save}
              </Button>
            {:else}
              <Button
                type="submit"
                disabled={step.name === "slip" && form.slipBlocked}
              >
                Next
                <ArrowRight />
              </Button>
            {/if}
          </div>
        </form>
      </DialogViews.View>
    {/each}

    <form
      bind:this={saveForm}
      hidden
      method="POST"
      action={TEXT.action}
      use:enhance={() => {
        form.errors = {};
        submitting = true;
        return async ({ result, update }) => {
          submitting = false;
          if (result.type === "success") {
            await update();
            open = false;
            toast.success(TEXT.saved, {
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
            const home = steps.find(
              (s) => field && fieldsOf(s.name).includes(field),
            );
            if (field && home && refusal?.error) {
              // Back to the step the refused field is on.
              form.errors = { [field]: refusal.error };
              view = home.name;
              await tick();
              document
                .getElementById(field)
                ?.scrollIntoView({ block: "center" });
              return;
            }
            toast.error(TEXT.notSaved, {
              description: refusal?.error ?? "Try again.",
            });
            return;
          }
          toast.error(TEXT.notSaved, {
            description: "Try again. If it keeps happening, contact ICT.",
          });
        };
      }}
    >
      <HiddenInput name="payload" value={form.payload} />
    </form>
  </DialogViews.Content>
</Dialog.Root>
