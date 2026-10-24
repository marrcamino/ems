<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Check, Copy, Info } from "@lucide/svelte/icons";
  import { getUsersContext } from "./context.svelte.js";

  /**
   * The one time the temporary password is readable. It is stored only as a
   * hash, so it cannot be shown again — if this is closed before it is written
   * down, the way forward is to reset it again.
   */
  const ctx = getUsersContext();

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The server runs on the office LAN over plain HTTP, where the clipboard API
   * is unavailable — browsers only expose it on a secure origin. The hidden
   * textarea below is the fallback that still works there.
   */
  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const scratch = document.createElement("textarea");
        scratch.value = text;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.opacity = "0";
        document.body.appendChild(scratch);
        scratch.select();
        document.execCommand("copy");
        document.body.removeChild(scratch);
      }

      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 2000);
    } catch {
      // Nothing to recover here — the password is on screen and can be typed.
      copied = false;
    }
  }
</script>

<Dialog.Root
  open={ctx.temporaryPassword !== null}
  onOpenChange={(open) => {
    if (!open) {
      ctx.clearTemporaryPassword();
      copied = false;
    }
  }}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Temporary password</Dialog.Title>
      <Dialog.Description>
        Give this to {ctx.temporaryPasswordFor ?? "this person"}. They will be
        asked to set their own password the first time they sign in.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex items-center gap-2">
      <code
        class="flex-1 rounded-lg border bg-muted/40 px-3 py-2.5 text-center font-mono text-lg tracking-wider select-all"
      >
        {ctx.temporaryPassword}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Copy the password"
        onclick={() => copyToClipboard(ctx.temporaryPassword ?? "")}
      >
        {#if copied}
          <Check />
        {:else}
          <Copy />
        {/if}
      </Button>
    </div>

    <Alert.Root variant="info">
      <Info />
      <Alert.Description>
        Write this down now — it can't be shown again. If it gets lost, reset
        the password from the menu beside their name.
      </Alert.Description>
    </Alert.Root>

    <Dialog.Footer>
      <Dialog.Close type="button" class={buttonVariants({ variant: "default" })}>
        Done
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
