<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import type { ElectricityBuilding } from "../electricity-types";

  let {
    open = $bindable(false),
    building = null,
  }: {
    open: boolean;
    /** The building to rename, or null to add one. */
    building: ElectricityBuilding | null;
  } = $props();

  const editing = $derived(building !== null);

  let name = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) name = building?.name ?? "";
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-100">
    <form
      class="grid gap-5"
      method="POST"
      action={editing ? "?/edit" : "?/add"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(editing ? "Building renamed" : "Building added");
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("electricity-building", "Building not saved", {
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
        <Dialog.Title>{editing ? "Rename building" : "Add building"}</Dialog.Title>
        <Dialog.Description>
          {editing
            ? "The new name also shows on the building's past entries."
            : "Add a building whose electricity is recorded on its own."}
        </Dialog.Description>
      </Dialog.Header>

      {#if building}
        <HiddenInput name="buildingPk" value={building.buildingPk} />
      {/if}

      <div class="grid gap-2">
        <Label for="name" required>Name</Label>
        <Input
          id="name"
          name="name"
          bind:value={name}
          maxlength={100}
          placeholder="For example, Nursery"
          required
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
          {editing ? "Save name" : "Add building"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
