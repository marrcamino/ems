<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import {
    FORM_LABELS,
    FORMS,
    formNumber,
    type Form,
  } from "$lib/utils/form-numbers.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { CircleAlert, TriangleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import AnimateContent from "./transition/animate-content.svelte";

  /**
   * The go-live note: until the starting numbers are set, nothing that needs
   * a number can be saved. Shown to everyone while that is so; the button and
   * the dialog only to someone who may set them. The page must spread
   * `startingNumbersActions` into its actions.
   *
   * ```svelte
   * <StartingNumbersNote canSet={gblCtx.can("fuel:set_starting_numbers")} />
   * ```
   */
  let { canSet, class: className }: { canSet: boolean; class?: string } =
    $props();

  const day = today(getLocalTimeZone()).toString();
  const year = day.slice(0, 4);

  let open = $state(false);
  let submitting = $state(false);
  let numbers = $state<Record<Form, number | null>>({
    control: null,
    ws: null,
    ris: null,
    dtt: null,
  });
  /**
   * Set by a save, so the page reloads only once the dialog has finished
   * closing. The reload removes this note, and the dialog inside it, so a
   * reload during the close animation made the dialog pop back for a moment.
   */
  let saved = false;

  function onOpenChangeComplete(isOpen: boolean) {
    if (isOpen || !saved) return;
    saved = false;
    invalidateAll();
  }

  /** The server's reason, when a number was given out in the meantime. */
  let refusal = $state<string | null>(null);

  $effect(() => {
    if (open) {
      numbers = { control: null, ws: null, ris: null, dtt: null };
      refusal = null;
    }
  });
</script>

<AnimateContent class={className}>
  <Alert.Root variant="warning">
    <TriangleAlert />
    <Alert.Title>Starting numbers not set</Alert.Title>
    <Alert.Description>
      <p>
        Withdrawals and RIS numbers cannot be recorded until GSU sets the
        numbers that EMS starts from. This is done once.
      </p>
      {#if canSet}
        <Button size="sm" onclick={() => (open = true)}>
          Set starting numbers
        </Button>
      {/if}
    </Alert.Description>
  </Alert.Root>
</AnimateContent>

{#if canSet}
  <Dialog.Root bind:open {onOpenChangeComplete}>
    <Dialog.Content class="sm:max-w-105">
      <form
        method="POST"
        action="?/setStartingNumbers"
        autocomplete="off"
        class="flex flex-col gap-4"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              toast.success("Starting numbers set");
              saved = true;
              open = false;
              submitting = false;
              return;
            }

            if (result.type === "failure") {
              const data = result.data as
                { error?: string; cutoverDone?: boolean } | undefined;
              if (data?.cutoverDone && data.error) refusal = data.error;
              else {
                toastErrorOnce("starting-numbers", "Numbers not set", {
                  description: data?.error ?? "Try again.",
                });
              }
            }

            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Set the starting numbers</Dialog.Title>
          <Dialog.Description>
            For each form, type the first number that EMS gives out in {year}:
            the one after the last number that was used before EMS, or 1 when
            none was used.
          </Dialog.Description>
        </Dialog.Header>

        {#if refusal}
          <Alert.Root variant="danger">
            <CircleAlert />
            <Alert.Title>Numbers not set</Alert.Title>
            <Alert.Description>{refusal}</Alert.Description>
          </Alert.Root>
        {:else}
          <div class="grid gap-4">
            {#each FORMS as name (name)}
              {@const value = numbers[name]}
              <Field.Field>
                <Field.Label for="starting-{name}"
                  >{FORM_LABELS[name]}</Field.Label
                >
                <NumberInput
                  id="starting-{name}"
                  bind:value={numbers[name]}
                  wholeDigits={4}
                  decimals={0}
                  placeholder="1"
                  required
                />
                <HiddenInput {name} value={value ?? ""} />
                {#if value !== null}
                  <Field.Description>
                    First number: {formNumber(day, value)}
                  </Field.Description>
                {/if}
              </Field.Field>
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
            {refusal ? "Close" : "Cancel"}
          </Button>
          {#if !refusal}
            <Button type="submit" disabled={submitting}>
              {#if submitting}
                <Spinner />
              {/if}
              Save
            </Button>
          {/if}
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>
{/if}
