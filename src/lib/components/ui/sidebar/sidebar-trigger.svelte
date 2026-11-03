<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Kbd from "$lib/components/ui/kbd/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { cn } from "$lib/utils/index.js";
  import { mergeProps } from "bits-ui";
  import type { ComponentProps } from "svelte";
  import { useSidebar } from "./context.svelte.js";

  let {
    ref = $bindable(null),
    class: className,
    onclick,
    ...restProps
  }: ComponentProps<typeof Button> & {
    onclick?: (e: MouseEvent) => void;
  } = $props();

  const sidebar = useSidebar();
  const open = $derived(sidebar.isMobile ? sidebar.openMobile : sidebar.open);
</script>

<Tooltip.Root delayDuration={500}>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button
        bind:ref
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        class={cn("cn-sidebar-trigger active:scale-100!", className)}
        type="button"
        {...mergeProps(props, restProps, {
          onclick: (e: MouseEvent) => {
            onclick?.(e);
            sidebar.toggle();
          },
        })}
      >
        <span
          aria-hidden="true"
          class="relative block w-4 border border-transparent ring-1"
          style="border-radius: 2px; height: 11px !important;"
        >
          <span
            data-open={open ? "" : null}
            class="absolute inset-y-0 my-[0.5px] translate-y-[0.15px] left-0 translate-x-[0.5px] rounded-[1px] bg-foreground duration-50 transition-[width] ease-out motion-reduce:transition-none data-open:w-1.5 w-0.5 data-open:group-hover/button:w-0.75 data-open:duration-150 group-hover/button:w-1"
          ></span>
        </span>
        <span class="sr-only">Toggle Sidebar</span>
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content side="bottom" align="start">
    {open ? "Collapse sidebar" : "Expand sidebar"}
    <div class="flex flex-col items-center gap-4">
      <p class="text-sm text-muted-foreground">
        <Kbd.Group>
          <Kbd.Root>Ctrl + B</Kbd.Root>
        </Kbd.Group>
      </p>
    </div>
  </Tooltip.Content>
</Tooltip.Root>
