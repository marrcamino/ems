<script lang="ts">
  import { Switch as SwitchPrimitive } from "bits-ui";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils/index.js";

  let {
    ref = $bindable(null),
    class: className,
    checked = $bindable(false),
    size = "default",
    ...restProps
  }: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
    size?: "sm" | "default";
  } = $props();
</script>

<!--
  The thumb is 2px smaller than shadcn's so a 2px ring of the track shows
  around it on every side (the 1px border plus 1px of room, which the px-px
  padding gives at the ends). The default track is 18px tall, not shadcn's
  18.4px: the extra 0.4px made the browser round the gap above and below
  differently, which pushed the thumb off centre.

  The thumb's box is 4px wider than the circle you see. At rest a clip-path
  hides the 4px on the side away from the track's end; while the switch is
  pressed the clip opens, so the circle stretches into a pill towards the
  other side, slowly enough (300ms) to see it grow while you hold. On release
  it snaps back in 150ms as the box slides over and the clip closes behind it,
  so the pill shrinks back into a circle as it lands. Only translate and
  clip-path move, never width. The shadow is a drop-shadow on the outer box
  because a box-shadow on the clipped circle would be clipped away.
-->
<SwitchPrimitive.Root
  bind:ref
  bind:checked
  data-slot="switch"
  data-size={size}
  class={cn(
    "shrink-0 rounded-full border border-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-4.5 data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 peer group/switch relative inline-flex items-center px-px transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
    className,
  )}
  {...restProps}
>
  <SwitchPrimitive.Thumb
    data-slot="switch-thumb"
    class="text-background group-data-[size=default]/switch:h-3.5 group-data-[size=default]/switch:w-4.5 group-data-[size=sm]/switch:h-2.5 group-data-[size=sm]/switch:w-3.5 group-data-[size=default]/switch:data-checked:translate-x-2.5 group-data-[size=sm]/switch:data-checked:translate-x-1.5 dark:data-checked:text-primary-foreground data-unchecked:translate-x-0 dark:data-unchecked:text-foreground pointer-events-none block drop-shadow-sm transition-[translate] duration-200 ease-in-out-strong motion-reduce:transition-none"
  >
    <span
      data-checked={checked ? "" : null}
      class={cn(
        "block size-full bg-current transition-[clip-path] duration-150 ease-out-strong",
        "data-checked:[clip-path:inset(0_0_0_4px_round_9999px)] [clip-path:inset(0_4px_0_0_round_9999px)]",
        "group-active/switch:[clip-path:inset(0_round_9999px)] group-active/switch:duration-300 group-active/switch:ease-in-out-strong",
      )}
    ></span>
  </SwitchPrimitive.Thumb>
</SwitchPrimitive.Root>
