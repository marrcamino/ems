<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import Badge from "@/components/ui/badge/badge.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { Supplier } from "@/types";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { fade } from "svelte/transition";
  import {
    groupTin,
    normalizeTin,
    TIN_FORMAT_ERROR,
    TIN_MAX_DIGITS,
  } from "./tin.js";

  /**
   * The add and edit supplier form. It is a DialogViews view inside the
   * suppliers dialog, which slides it in over the list, rather than a dialog
   * of its own on top of that one. The dialog mounts a fresh copy each time it is
   * shown, so the fields are seeded once, here, and never overwritten while
   * the admin types.
   */
  let {
    supplierToEdit,
    onSaved,
    onCancel,
  }: {
    supplierToEdit: Supplier | null;
    onSaved: (row: Supplier, mode: "add" | "edit") => void;
    onCancel: () => void;
  } = $props();

  const mode = $derived(supplierToEdit ? "edit" : "add");
  const isEditMode = $derived(mode === "edit");

  const seed = untrack(() => supplierToEdit);
  let supplierName = $state(seed?.supplierName ?? "");
  let businessAddress = $state(seed?.businessAddress ?? "");
  let tin = $state(groupTin(seed?.tin ?? ""));
  let philgepsNumber = $state(seed?.philgepsNumber ?? "");
  let submitting = $state(false);

  /**
   * Messages from the server that belong to one field, shown under it. A TIN
   * already on another supplier is the one that happens in practice.
   */
  let fieldErrors = $state<Record<string, string>>({});

  // The error under a field goes away as soon as it is changed, since the
  // admin is fixing it.
  function clearError(field: string) {
    if (fieldErrors[field]) delete fieldErrors[field];
  }

  /**
   * Where the cursor goes after the TIN is regrouped: just after the same
   * number of digits that were before it, so the spaces that come and go
   * while typing in the middle never push the cursor to the end.
   */
  function caretAfterDigits(value: string, digitCount: number) {
    if (digitCount === 0) return 0;
    let seen = 0;
    for (let i = 0; i < value.length; i++) {
      if (/\d/.test(value[i]) && ++seen === digitCount) return i + 1;
    }
    return value.length;
  }

  /** Writes the regrouped TIN into the field and puts the cursor back. */
  function setTin(el: HTMLInputElement, digits: string, digitsBefore: number) {
    tin = groupTin(digits.slice(0, TIN_MAX_DIGITS));
    // Written straight to the field as well as to `tin`, so the cursor can
    // be placed now rather than after Svelte updates the field, which would
    // move it to the end.
    el.value = tin;
    const caret = caretAfterDigits(tin, digitsBefore);
    el.setSelectionRange(caret, caret);
    clearError("tin");
  }

  /**
   * Keeps only digits, whether typed or pasted, and adds a space after every
   * 3 of them.
   */
  function onTinInput(event: Event) {
    const el = event.currentTarget as HTMLInputElement;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBefore = el.value.slice(0, caret).replace(/\D/g, "").length;
    setTin(el, el.value.replace(/\D/g, ""), digitsBefore);
  }

  /**
   * Backspace just after a space, or Delete just before one, would only
   * remove the space, which the regrouping puts straight back, so the key
   * would seem to do nothing. It removes the digit on the other side of the
   * space instead.
   */
  function onTinKeydown(event: KeyboardEvent) {
    const el = event.currentTarget as HTMLInputElement;
    const start = el.selectionStart ?? 0;
    if (start !== el.selectionEnd) return;

    const backOverSpace =
      event.key === "Backspace" && el.value[start - 1] === " ";
    const forwardOverSpace = event.key === "Delete" && el.value[start] === " ";
    if (!backOverSpace && !forwardOverSpace) return;

    event.preventDefault();
    const digits = el.value.replace(/\D/g, "");
    const digitsBefore = el.value.slice(0, start).replace(/\D/g, "").length;
    const removeAt = backOverSpace ? digitsBefore - 1 : digitsBefore;
    setTin(
      el,
      digits.slice(0, removeAt) + digits.slice(removeAt + 1),
      backOverSpace ? digitsBefore - 1 : digitsBefore,
    );
  }

  /**
   * Says at once when the TIN has the wrong number of digits, once the admin
   * leaves the field, rather than waiting for Save.
   */
  function onTinBlur() {
    if (tin && !normalizeTin(tin)) fieldErrors.tin = TIN_FORMAT_ERROR;
  }
</script>

<form
  class="flex min-h-0 flex-col gap-4"
  method="POST"
  action={isEditMode ? "?/updateSupplier" : "?/createSupplier"}
  autocomplete="off"
  use:enhance={({ cancel }) => {
    if (tin && !normalizeTin(tin)) {
      fieldErrors.tin = TIN_FORMAT_ERROR;
      cancel();
      return;
    }

    submitting = true;
    return async ({ result, update }) => {
      if (result.type === "success") {
        const row = (result.data?.newRow ??
          result.data?.updatedRow) as Supplier;
        onSaved(row, mode);
        toast.success(isEditMode ? "Supplier updated" : "Supplier added");
      }

      if (result.type === "failure") {
        const data = result.data as
          | { error?: string; field?: string }
          | undefined;
        if (data?.field && data.error) {
          fieldErrors[data.field] = data.error;
        } else {
          toast.error(
            isEditMode ? "Supplier not saved" : "Supplier not added",
            {
              description: data?.error ?? "Try again.",
            },
          );
        }
      }

      await update({ reset: false });
      submitting = false;
    };
  }}
>
  {#if supplierToEdit}
    <HiddenInput name="supplierPk" value={supplierToEdit.supplierPk} />
  {/if}

  <!-- Only the fields scroll, so Cancel and Save stay in reach. -->
  <div class="-mx-4 min-h-0 overflow-y-auto px-4 pb-1">
    <Field.Group class="gap-4">
      <Field.Field data-invalid={fieldErrors.supplierName ? true : undefined}>
        <Field.Label for="supplierName">Supplier name</Field.Label>
        <Input
          data-autofocus
          id="supplierName"
          name="supplierName"
          bind:value={supplierName}
          oninput={() => clearError("supplierName")}
          placeholder="San Jose Fuel Station"
          maxlength={150}
          aria-invalid={fieldErrors.supplierName ? true : undefined}
          required
        />
        <Field.Error>{fieldErrors.supplierName}</Field.Error>
      </Field.Field>

      <Field.Field
        data-invalid={fieldErrors.businessAddress ? true : undefined}
      >
        <Field.Label for="businessAddress" class="gap-1">
          Business address

          {#if businessAddress.trim().length > 225}
            <div in:fade={{ duration: 250 }} out:fade={{ duration: 150 }}>
              <Badge variant="secondary" class="h-4 px-1.5"
                >{businessAddress.trim().length}/255</Badge
              >
            </div>
          {/if}
        </Field.Label>
        <Textarea
          id="businessAddress"
          name="businessAddress"
          bind:value={businessAddress}
          oninput={() => clearError("businessAddress")}
          placeholder="Purok 2, Brgy. Justiniana Edera, San Jose, Dinagat Islands"
          maxlength={255}
          rows={2}
          aria-invalid={fieldErrors.businessAddress ? true : undefined}
          required
        />
        <Field.Error>{fieldErrors.businessAddress}</Field.Error>
      </Field.Field>

      <Field.Field data-invalid={fieldErrors.tin ? true : undefined}>
        <Field.Label for="tin">TIN</Field.Label>
        <!--
          `value` rather than `bind:value`, because onTinInput rewrites what
          was typed and has to be the only thing that writes to `tin`.
        -->
        <Input
          id="tin"
          name="tin"
          value={tin}
          oninput={onTinInput}
          onkeydown={onTinKeydown}
          onblur={onTinBlur}
          placeholder="000 000 000 000"
          inputmode="numeric"
          aria-invalid={fieldErrors.tin ? true : undefined}
          required
        />
        {#if fieldErrors.tin}
          <Field.Error>{fieldErrors.tin}</Field.Error>
        {:else}
          <Field.Description>
            No two suppliers can have the same TIN.
          </Field.Description>
        {/if}
      </Field.Field>

      <Field.Field>
        <Field.Label for="philgepsNumber">
          PhilGEPS registration no.
          <span class="text-muted-foreground font-normal">(optional)</span>
        </Field.Label>
        <Input
          id="philgepsNumber"
          name="philgepsNumber"
          bind:value={philgepsNumber}
          maxlength={50}
        />
        <Field.Description>
          The number on the supplier's Philippine Government Electronic
          Procurement System registration.
        </Field.Description>
      </Field.Field>
    </Field.Group>
  </div>

  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button
      type="button"
      variant="outline"
      onclick={onCancel}
      disabled={submitting}
    >
      Cancel
    </Button>
    <Button type="submit" disabled={submitting}>
      {#if submitting}
        <Spinner />
      {/if}
      {isEditMode ? "Save changes" : "Add supplier"}
    </Button>
  </div>
</form>
