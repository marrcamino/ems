<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner";
  import { Eye, EyeOff } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { getPasswordStrengthError } from "$lib/validation/password";
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
  let password = $state("");
  let confirmPassword = $state("");
  let showPass = $state(false);
  let showConfirmPass = $state(false);

  let passwordTouched = $state(false);
  let confirmTouched = $state(false);

  let passwordError = $derived(
    passwordTouched ? getPasswordStrengthError(password) : "",
  );
  let confirmError = $derived(
    confirmTouched && confirmPassword !== password
      ? "Passwords do not match"
      : "",
  );
  let isValid = $derived(
    getPasswordStrengthError(password) === "" && confirmPassword === password,
  );
</script>

<div
  class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <Card.Root>
      <Card.Header class="text-center">
        <Card.Title class="text-xl">Set a New Password</Card.Title>
        <Card.Description
          >For security, you must set a new password before continuing.</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <form
          method="POST"
          use:enhance={({ cancel }) => {
            passwordTouched = true;
            confirmTouched = true;
            if (!isValid) {
              cancel();
              return;
            }

            loading = true;
            return async ({ result, update }) => {
              loading = false;

              if (result.type === "failure") {
                toast.error("Password failed to update");
                console.log(result.data);
              }

              if (result.type === "redirect") {
                toast.success("Password updated");
              }
              await update();
            };
          }}
        >
          <FieldGroup>
            <Field>
              <div class="flex items-center">
                <FieldLabel for="password-new">Password</FieldLabel>
              </div>

              <div class="relative">
                <Input
                  id="password-new"
                  type={showPass ? "text" : "password"}
                  autocomplete="new-password"
                  required
                  tabindex={2}
                  aria-invalid={passwordError.length ? true : null}
                  bind:value={password}
                  onblur={() => (passwordTouched = true)}
                  name="password"
                />

                <Button
                  data-visible={password.trim().length ? "" : null}
                  tabindex={-1}
                  size="icon-sm"
                  variant="ghost"
                  class="absolute right-0.5 top-0.5 data-visible:opacity-100 opacity-0 pointer-events-none data-visible:pointer-events-auto"
                  onclick={() => (showPass = !showPass)}
                >
                  <div class="relative">
                    {#if showPass}
                      <EyeOff />
                    {:else}
                      <Eye />
                    {/if}
                  </div>
                </Button>
              </div>

              {#if passwordError.length}
                <div in:slide={{ duration: 150 }} out:slide={{ duration: 200 }}>
                  <div transition:fade>
                    <FieldError class="min-h-4">{passwordError}</FieldError>
                  </div>
                </div>
              {/if}
            </Field>

            <Field>
              <div class="flex items-center">
                <FieldLabel for="password-confirm">Confirm Password</FieldLabel>
              </div>

              <div class="relative">
                <Input
                  id="password-confirm"
                  type={showConfirmPass ? "text" : "password"}
                  autocomplete="new-password"
                  required
                  tabindex={2}
                  aria-invalid={confirmError.length ? true : null}
                  bind:value={confirmPassword}
                  onblur={() => (confirmTouched = true)}
                  name="confirmPassword"
                />

                <Button
                  data-visible={confirmPassword.trim().length ? "" : null}
                  tabindex={-1}
                  size="icon-sm"
                  variant="ghost"
                  class="absolute right-0.5 top-0.5 data-visible:opacity-100 opacity-0 pointer-events-none data-visible:pointer-events-auto"
                  onclick={() => (showConfirmPass = !showConfirmPass)}
                >
                  <div class="relative">
                    {#if showConfirmPass}
                      <EyeOff />
                    {:else}
                      <Eye />
                    {/if}
                  </div>
                </Button>
              </div>

              {#if confirmError.length}
                <div in:slide={{ duration: 150 }} out:slide={{ duration: 200 }}>
                  <div transition:fade>
                    <FieldError class="min-h-4">{confirmError}</FieldError>
                  </div>
                </div>
              {/if}
            </Field>

            <Field>
              <Button type="submit" disabled={loading} tabindex={3}>
                {#if loading}
                  <Spinner />
                {/if}
                Update Password
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </Card.Content>
    </Card.Root>
  </div>
</div>
