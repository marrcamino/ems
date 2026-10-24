<!--
  What the admin is shown when the person being entered looks like somebody
  already in the system.

  It sits inside the form on purpose. The admin has a half-filled form on
  screen and nothing here may take them away from it — the way out of every
  case is either to correct a field or to press one button, both of which stay
  on this dialog.
-->
<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Info, TriangleAlert, UserX } from "@lucide/svelte/icons";
  import { getEmployeesContext } from "./context.svelte.js";
  import { describePerson, nameWithBirthDate } from "./duplicate-check.js";

  let { submitting }: { submitting: boolean } = $props();

  const ctx = getEmployeesContext();

  const matched = $derived(ctx.duplicateFinding?.person ?? null);
  const editing = $derived(ctx.mode === "edit");
</script>

{#if matched}
  {#if ctx.canBringBack}
    <!-- Exact match on somebody who has left, while adding a new person. -->
    <Alert.Root variant="info">
      <Info />
      <Alert.Title>This person worked here before</Alert.Title>
      <Alert.Description class="grid gap-2">
        <p>
          {nameWithBirthDate(matched)} is already in the system and is marked as
          no longer employed. You do not need to add them again. You can bring
          their record back instead.
        </p>

        {#if ctx.bringBackChanges.length > 0}
          <div class="grid gap-1">
            <span class="font-medium">These details will be updated:</span>
            <ul class="grid gap-0.5">
              {#each ctx.bringBackChanges as change (change.label)}
                <li>
                  {change.label}: {change.from} &rarr; {change.to}
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <p>
            Nothing else will change. The details you entered are the same as
            the ones already recorded.
          </p>
        {/if}

        <!--
          Submits the same form to a different action, so everything typed
          goes with it. The record brought back is the matched one, not the
          one being edited — there is no record being edited here.
        -->
        <input type="hidden" name="employeePk" value={matched.employeePk} />
        <Button
          type="submit"
          formaction="?/reinstate"
          size="sm"
          class="w-max"
          disabled={submitting}
        >
          Bring this person back
        </Button>
      </Alert.Description>
    </Alert.Root>
  {:else if ctx.blockedByDuplicate}
    <!-- Exact match with nothing to offer: already employed, or an edit. -->
    <Alert.Root variant="danger">
      <UserX />
      <Alert.Title>This person is already in the system</Alert.Title>
      <Alert.Description class="grid gap-2">
        {#if editing}
          <p>
            These changes would make this person the same as {nameWithBirthDate(
              matched,
            )}, who is already recorded.
          </p>
        {:else}
          <p>
            {nameWithBirthDate(matched)} is already recorded and is still employed.
            The same person cannot be added twice.
          </p>
        {/if}

        <p><span class="font-medium">Already recorded as:</span></p>
        <p>{describePerson(matched)}</p>

        <p>
          If you think this is a different person, please check both records.
          The birth date on one of them may have been typed wrongly.
        </p>
      </Alert.Description>
    </Alert.Root>
  {:else if ctx.possibleMatch}
    <!-- Might be the same person, might not. The admin decides. -->
    <Alert.Root variant="warning">
      <TriangleAlert />
      <Alert.Title>
        {ctx.possibleMatch.kind === "shared-birth-date"
          ? "Someone with the same birth date is already in the system"
          : "Someone with the same name is already in the system"}
      </Alert.Title>
      <Alert.Description class="grid gap-2">
        {#if ctx.possibleMatch.kind === "shared-birth-date"}
          <p>
            This person has the same birth date as someone already recorded, but
            the name is written differently.
          </p>
        {:else}
          <p>
            {matched.firstName}
            {matched.lastName} is already recorded, but that record has no birth
            date, so the same person cannot be told apart from a different one.
          </p>
        {/if}

        <p><span class="font-medium">Already recorded as:</span></p>
        <p>{nameWithBirthDate(matched)}</p>
        <p>{describePerson(matched)}</p>

        {#if ctx.possibleMatch.kind === "shared-birth-date"}
          <p>
            This may be the same person, if a surname changed after marriage, or
            if a first name was written differently — "Ma." instead of "Maria",
            for example. It may also be two different people who happen to share
            a birthday.
          </p>
        {/if}

        <p>Please check both records before you continue.</p>

        {#if ctx.confirmedDifferentPerson}
          <p class="font-medium">
            You answered that this is a different person. You can save now.
          </p>
        {:else}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-max"
            onclick={() => (ctx.confirmedDifferentPerson = true)}
          >
            Yes, this is a different person
          </Button>
        {/if}
      </Alert.Description>
    </Alert.Root>
  {/if}
{/if}
