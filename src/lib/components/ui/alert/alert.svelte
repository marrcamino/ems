<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const alertVariants = tv({
    base: "grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        warning:
          "dark:text-yellow-100 text-yellow-800 bg-yellow-200/20 *:data-[slot=alert-description]:text-yellow-800 *:data-[slot=alert-description]:dark:text-yellow-100/80 [&>svg]:text-current border-yellow-800 dark:border-yellow-100/60",
        danger:
          "dark:text-red-200 text-red-800 dark:border-destructive bg-destructive/20 *:data-[slot=alert-description]:text-red-800 *:data-[slot=alert-description]:dark:text-red-200/80 [&>svg]:text-current border-red-500",
        success:
          "dark:text-green-100 text-green-800 bg-green-400/15 *:data-[slot=alert-description]:text-green-800 *:data-[slot=alert-description]:dark:text-green-100/70 [&>svg]:text-current dark:border-green-100/50 border-green-800",
        info: "text-info bg-blue-400/15 *:data-[slot=alert-description]:text-blue-800 *:data-[slot=alert-description]:dark:text-blue-100/70 [&>svg]:text-current dark:border-blue-100/50 border-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils/index.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    variant?: AlertVariant;
  } = $props();
</script>

<div
  bind:this={ref}
  data-slot="alert"
  role="alert"
  class={cn(alertVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</div>
