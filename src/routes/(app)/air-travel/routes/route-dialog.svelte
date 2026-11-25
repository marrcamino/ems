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
  import type { AirTravelRoute } from "../air-travel-types";

  let {
    open = $bindable(false),
    route = null,
  }: {
    open: boolean;
    /** The route to edit, or null to add one. */
    route: AirTravelRoute | null;
  } = $props();

  const editing = $derived(route !== null);
  // Flights keep the places they were saved with, so a route in use keeps
  // its places; the server refuses the change too.
  const placesLocked = $derived((route?.flights ?? 0) > 0);

  let placeA = $state("");
  let placeB = $state("");
  let distanceKm = $state<number | null>(null);
  let source = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) {
      placeA = route?.placeA ?? "";
      placeB = route?.placeB ?? "";
      distanceKm = route?.distanceKm ?? null;
      source = route?.source ?? "";
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
            toast.success(editing ? "Route updated" : "Route added");
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("air-travel-route", "Route not saved", {
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
        <Dialog.Title>{editing ? "Edit route" : "Add route"}</Dialog.Title>
        <Dialog.Description>
          {editing
            ? "Correct the details of this route."
            : "A route counts both ways: Butuan – Manila is also Manila – Butuan."}
        </Dialog.Description>
      </Dialog.Header>

      {#if route}
        <HiddenInput name="routePk" value={route.routePk} />
      {/if}
      <HiddenInput name="distanceKm" value={distanceKm ?? ""} />

      <div class="grid grid-cols-2 gap-3">
        <div class="grid min-w-0 gap-2">
          <Label for="placeA" required>Place</Label>
          <Input
            id="placeA"
            name="placeA"
            bind:value={placeA}
            maxlength={100}
            placeholder="For example, Butuan"
            readonly={placesLocked}
            required
          />
        </div>
        <div class="grid min-w-0 gap-2">
          <Label for="placeB" required>Other place</Label>
          <Input
            id="placeB"
            name="placeB"
            bind:value={placeB}
            maxlength={100}
            placeholder="For example, Manila"
            readonly={placesLocked}
            required
          />
        </div>
      </div>

      <div class="grid gap-2">
        <Label for="distanceKm" required>Distance, one way</Label>
        <InputGroup.Root>
          <NumberInput
            grouped
            id="distanceKm"
            wholeDigits={5}
            decimals={0}
            placeholder="0"
            bind:value={distanceKm}
            required
          />
          <InputGroup.Addon align="inline-end">km</InputGroup.Addon>
        </InputGroup.Root>
      </div>

      <div class="grid gap-2">
        <Label for="source">Source</Label>
        <Input
          id="source"
          name="source"
          bind:value={source}
          maxlength={150}
          placeholder="For example, greatcirclemapper.net"
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
          {editing ? "Save changes" : "Add route"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
