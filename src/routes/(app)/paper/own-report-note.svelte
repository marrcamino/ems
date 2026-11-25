<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Info } from "@lucide/svelte/icons";

  /**
   * GSU's reminder, in its Submit dialog, that its own report is received
   * as it is submitted. Hidden with its button, it comes back six months
   * later, in case GSU has forgotten (paper-consumption.md). Remembered in
   * this browser only, per person.
   */
  let { userPk }: { userPk: number } = $props();

  const HIDDEN_FOR_MS = 182 * 24 * 60 * 60 * 1000;
  const storageKey = $derived(`paper-own-report-note-hidden:${userPk}`);

  function hiddenRecently() {
    if (typeof localStorage === "undefined") return false;
    const hiddenAt = Number(localStorage.getItem(storageKey));
    return !!hiddenAt && Date.now() - hiddenAt < HIDDEN_FOR_MS;
  }

  // Read once, when the dialog opens and mounts this note.
  let shown = $state(!hiddenRecently());

  function hide() {
    localStorage.setItem(storageKey, String(Date.now()));
    shown = false;
  }
</script>

{#if shown}
  <Alert.Root variant="info">
    <Info />
    <Alert.Title>Received automatically</Alert.Title>
    <Alert.Description>
      This report will be marked as received automatically once you submit it.
      <Button variant="outline" size="sm" class="mt-1.5" onclick={hide}>
        Okay, got it
      </Button>
    </Alert.Description>
  </Alert.Root>
{/if}
