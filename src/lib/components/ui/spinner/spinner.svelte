<script lang="ts">
  import { cn } from "$lib/utils";
  import type { SVGAttributes } from "svelte/elements";
  let {
    class: className,
    role = "status",
    // we add name, color, and stroke for compatibility with different icon libraries props
    name,
    color,
    stroke,
    "aria-label": ariaLabel = "Loading",
    ...restProps
  }: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
  {role}
  name={name === null ? undefined : name}
  color={color === null ? undefined : color}
  stroke={stroke === null ? undefined : stroke}
  aria-label={ariaLabel}
  class={cn("size-4 animate-spin", className)}
  fill="none"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  {...restProps}
>
  <title>Loading spinner</title>
  <defs>
    <linearGradient
      id="fade"
      gradientUnits="userSpaceOnUse"
      x1="12"
      y1="3"
      x2="18.89"
      y2="17.79"
    >
      <stop offset="0" stop-color="currentColor" stop-opacity="0" />
      <stop offset="1" stop-color="currentColor" stop-opacity="1" />
    </linearGradient>
  </defs>
  <circle
    cx="12"
    cy="12"
    r="9"
    fill="none"
    stroke="currentColor"
    stroke-opacity="0.16"
    stroke-width="2"
  />
  <path
    d="M 12 3 A 9 9 0 0 1 18.89 17.79"
    fill="none"
    stroke="url(#fade)"
    stroke-width="2"
    stroke-linecap="round"
  />
</svg>
