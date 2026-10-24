<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { cn } from "$lib/utils/index.js";
  import { toast } from "svelte-sonner";
  import { inUseMessage, type AssetTypeRow } from "./types.js";

  let {
    open = $bindable(false),
    assetTypeToDelete = null,
    onDeleted,
    onSwitchedOff,
  }: {
    open: boolean;
    assetTypeToDelete: AssetTypeRow | null;
    onDeleted: (assetTypePk: number) => void;
    onSwitchedOff: (row: AssetTypeRow) => void;
  } = $props();

  /**
   * The whole dialog turns on this one question, and it is answered before
   * the dialog opens rather than while the admin is reading it. Both cases
   * are a confirmation, but they ask different things and their buttons do
   * different work, so they are written out separately instead of as one
   * message with a word swapped.
   */
  const isInUse = $derived((assetTypeToDelete?.usage.count ?? 0) > 0);

  const name = $derived(assetTypeToDelete?.assetTypeName ?? "");

  const usageSentence = $derived(
    assetTypeToDelete ? inUseMessage(name, assetTypeToDelete.usage) : "",
  );

  let submitting = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>
        {#if isInUse}
          Deactivate {name} instead?
        {:else}
          Delete {name}?
        {/if}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {#if isInUse}
          {usageSentence}
        {:else}
          No assets are recorded as this type. Deleting it cannot be undone.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>

      <!--
        One form, whose action follows the same question the wording does.
        Deactivating a type needs no confirmation of its own — it
        is undone from this page in one click — which is why the offer sits
        here rather than opening a second dialog on top of this one.
      -->
      <form
        method="POST"
        action={isInUse ? "?/setTypeStatus" : "?/removeType"}
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              if (isInUse) {
                onSwitchedOff(result.data?.updatedRow as AssetTypeRow);
                toast.success(`${name} deactivated`);
              } else {
                onDeleted(result.data?.deletedPk as number);
                toast.success(`${name} was deleted`);
              }
              open = false;
            }

            if (result.type === "failure") {
              toast.error(
                (result.data as { error?: string } | undefined)?.error ??
                  "Something went wrong.",
              );
              open = false;
            }

            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        <HiddenInput
          name="assetTypePk"
          value={assetTypeToDelete?.assetTypePk}
        />
        {#if isInUse}
          <HiddenInput name="status" value="inactive" />
        {/if}
        <button
          type="submit"
          disabled={submitting}
          class={cn(
            buttonVariants({ variant: isInUse ? "default" : "destructive" }),
          )}
        >
          {#if submitting}
            <Spinner />
          {/if}
          {isInUse ? "Deactivate" : "Delete"}
        </button>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
