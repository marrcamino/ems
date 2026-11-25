<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { CircleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import type { ListRow } from "./ris-row.js";

  /**
   * Asks before deleting a reservation. The row menu always opens it, and
   * when the number is not the newest, the reason shows here with Delete
   * unavailable (the owner, 17 November 2026). The server checks again,
   * because a number may have been given out since the page loaded.
   */
  let {
    open = $bindable(false),
    row = null,
    blockedReason,
    onDeleted,
  }: {
    open: boolean;
    row: ListRow | null;
    /** Why the list already shows that it cannot be deleted, if it does. */
    blockedReason: string | undefined;
    onDeleted: (id: number) => void;
  } = $props();

  let submitting = $state(false);
  /** The server's refusal, which stays until the dialog is opened again. */
  let refusal = $state<string | null>(null);

  $effect(() => {
    if (open) refusal = null;
  });

  const reason = $derived(refusal ?? blockedReason);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete RIS {row?.shortNumber}?</AlertDialog.Title>
      <AlertDialog.Description>
        The number goes back to the count, so the next reservation gets it
        again. This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if reason}
      <Alert.Root variant="danger">
        <CircleAlert />
        <Alert.Title>Not the newest number</Alert.Title>
        <Alert.Description>{reason}</Alert.Description>
      </Alert.Root>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>
        {reason ? "Close" : "Cancel"}
      </AlertDialog.Cancel>
      <form
        method="POST"
        action="?/remove"
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            if (result.type === "success") {
              onDeleted(result.data?.deletedId as number);
              toast.success(`RIS ${row?.shortNumber} deleted`);
              open = false;
            } else if (result.type === "failure") {
              const data = result.data as
                { error?: string; notNewest?: boolean } | undefined;
              if (data?.notNewest && data.error) refusal = data.error;
              else {
                toast.error(`RIS ${row?.shortNumber} not deleted`, {
                  description: data?.error ?? "Try again.",
                });
                open = false;
              }
            } else {
              toast.error(`RIS ${row?.shortNumber} not deleted`, {
                description: "Try again.",
              });
            }
            submitting = false;
          };
        }}
      >
        <HiddenInput name="id" value={row?.id} />
        <button
          type="submit"
          disabled={submitting || !!reason}
          class={buttonVariants({ variant: "destructive" })}
        >
          {#if submitting}
            <Spinner />
          {/if}
          Delete
        </button>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
