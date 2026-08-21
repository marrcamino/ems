<script lang="ts" module>
  export type ErrorDetail = { label: string; value: string };
</script>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
  import LockIcon from "@lucide/svelte/icons/lock";
  import SearchXIcon from "@lucide/svelte/icons/search-x";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

  type Props = {
    status?: number;
    title?: string;
    description?: string;
    details?: ErrorDetail[];
    homeHref?: string;
    homeLabel?: string;
    showIcon?: boolean;
    showBackButton?: boolean;
    showDetails?: boolean;
    class?: string;
  };

  let {
    status = 500,
    title,
    description,
    details = [],
    homeHref = "/",
    homeLabel = "Return to dashboard",
    showIcon = true,
    showBackButton = true,
    showDetails = true,
    class: className,
  }: Props = $props();

  const presets = {
    404: {
      icon: SearchXIcon,
      title: "Page not found",
      description:
        "This page doesn't exist, or it was moved. Check the link, or head back to the dashboard.",
    },
    403: {
      icon: LockIcon,
      title: "You don't have access to this page",
      description:
        "Your role doesn't include this permission. Ask an administrator if you need it.",
    },
    500: {
      icon: TriangleAlertIcon,
      title: "Something went wrong",
      description:
        "The server couldn't complete this request. Nothing you entered was lost. Try again in a moment.",
    },
  } as const;

  const preset = $derived(
    presets[status as keyof typeof presets] ?? presets[500],
  );
  const heading = $derived(title ?? preset.title);
  const body = $derived(description ?? preset.description);
  const Icon = $derived(preset.icon);
  // server errors get the destructive tint; 4xx stays neutral
  const isServerError = $derived(status >= 500);
  const hasDetails = $derived(showDetails && details.length > 0);

  let open = $state(false);
</script>

<div
  class={cn(
    "flex min-h-115 flex-1 items-center justify-center px-8 py-16",
    className,
  )}
>
  <div class="flex max-w-115 flex-col items-center text-center">
    {#if showIcon}
      <div
        class={cn(
          "mb-7 grid size-11 place-items-center rounded-lg border",
          isServerError
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <Icon class="size-5" strokeWidth={1.75} />
      </div>
    {/if}

    <div
      class="text-[84px] leading-[0.9] font-semibold tracking-[-0.045em] tabular-nums"
    >
      {status}
    </div>

    <h2 class="mt-5.5 text-xl font-semibold tracking-[-0.015em]">
      {heading}
    </h2>
    <p
      class="mt-2 text-[0.9rem] leading-[1.55] text-pretty text-muted-foreground"
    >
      {body}
    </p>

    <div class="mt-7 flex flex-wrap justify-center gap-2">
      <Button href={homeHref} size="lg" class="px-3">
        <LayoutDashboardIcon />
        {homeLabel}
      </Button>
      {#if showBackButton}
        <Button
          variant="ghost"
          size="lg"
          class="px-3"
          onclick={() => history.back()}
        >
          <ArrowLeftIcon />
          Go back
        </Button>
      {/if}
    </div>

    {#if hasDetails}
      <div class="mt-8 flex w-full flex-col items-center gap-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="error-state-details"
          onclick={() => (open = !open)}
          class="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ChevronRightIcon
            class={cn(
              "size-3 transition-transform duration-150",
              open && "rotate-90",
            )}
          />
          Error details
        </button>
        {#if open}
          <dl
            id="error-state-details"
            class="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-border bg-muted px-3.5 py-3 text-left font-mono text-[0.72rem] leading-[1.7] text-muted-foreground"
          >
            {#each details as detail (detail.label)}
              <dt>{detail.label}</dt>
              <dd class="wrap-anywhere">
                {detail.value}
              </dd>
            {/each}
          </dl>
        {/if}
      </div>
    {/if}
  </div>
</div>
