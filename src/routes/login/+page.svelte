<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner";
  import { cn } from "$lib/utils/index.js";
  import { Eye, EyeOff } from "@lucide/svelte/icons";
  import type { HTMLAttributes } from "svelte/elements";
  import { fade, slide } from "svelte/transition";

  let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
    $props();
  const id = $props.id();
  let username = $state("");
  let password = $state("");
  let error = $state("");
  let showPass = $state(false);
  let loading = $state(false);
</script>

<div
  class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col items-center self-center font-medium">
      <p>Environmental Management System</p>
      <p class="text-muted-foreground">DENR-PENRO Dinagat Islands</p>
    </div>

    <div class={cn("flex flex-col gap-6", className)} {...restProps}>
      <Card.Root>
        <Card.Header class="text-center">
          <Card.Title class="text-xl">Log in to continue</Card.Title>
          <Card.Description
            >Log in with your assigned username and password</Card.Description
          >
        </Card.Header>
        <Card.Content>
          <form
            method="POST"
            action="?/login"
            use:enhance={() => {
              loading = true;
              error = "";
              return async ({ result, update }) => {
                loading = false;
                if (result.type === "failure") {
                  error =
                    (result.data as { error?: string })?.error ??
                    "Login failed.";
                }
                // default `update()` handles redirect + invalidateAll for you
                await update();
              };
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel for="username-{id}">Username</FieldLabel>
                <Input
                  autocomplete="username"
                  name="username"
                  id="username-{id}"
                  type="text"
                  required
                  tabindex={1}
                  aria-invalid={error.length ? true : null}
                  bind:value={username}
                />
              </Field>
              <Field>
                <div class="flex items-center">
                  <FieldLabel for="password-{id}">Password</FieldLabel>

                  <AlertDialog.Root>
                    <AlertDialog.Trigger
                      type="button"
                      tabindex={4}
                      disabled={loading}
                      class={buttonVariants({
                        variant: "link",
                        className:
                          "ms-auto px-1.5 py-1 text-sm underline-offset-4 hover:underline leading-4 h-5",
                      })}>Forgot your password?</AlertDialog.Trigger
                    >
                    <AlertDialog.Content>
                      <AlertDialog.Header>
                        <AlertDialog.Title>Password Reset</AlertDialog.Title>
                        <AlertDialog.Description>
                          Password resets aren't self-service. Please contact
                          your system administrator to have your password reset.
                        </AlertDialog.Description>
                      </AlertDialog.Header>
                      <AlertDialog.Footer>
                        <AlertDialog.Cancel>Understood</AlertDialog.Cancel>
                      </AlertDialog.Footer>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </div>

                <div class="relative">
                  <Input
                    id="password-{id}"
                    type={showPass ? "text" : "password"}
                    autocomplete="current-password"
                    name="password"
                    required
                    tabindex={2}
                    aria-invalid={error.length ? true : null}
                    bind:value={password}
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

                {#if error.length}
                  <div
                    in:slide={{ duration: 150 }}
                    out:slide={{ delay: 5000, duration: 200 }}
                  >
                    <div transition:fade>
                      <FieldError class="min-h-4">{error}</FieldError>
                    </div>
                  </div>
                {/if}
              </Field>
              <Field>
                <Button type="submit" disabled={loading} tabindex={3}>
                  {#if loading}
                    <Spinner />
                  {/if}
                  Login
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
