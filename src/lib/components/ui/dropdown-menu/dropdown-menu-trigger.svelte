<script lang="ts">
  import { cn } from "@/utils";
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    onpointerdown,
    ...restProps
  }: DropdownMenuPrimitive.TriggerProps = $props();

  /**
   * The press effect every button has, done by hand here. Bits UI cancels
   * `pointerdown` on the trigger when it opens the menu, so the menu can
   * take focus, and a cancelled `pointerdown` never puts the element into
   * `:active`. Any `active:` class is therefore dead on a trigger, and this
   * flag stands in for it.
   */
  let pressed = $state(false);

  function release() {
    pressed = false;
  }

  type PointerDownEvent = Parameters<
    NonNullable<DropdownMenuPrimitive.TriggerProps["onpointerdown"]>
  >[0];

  function handlePointerDown(e: PointerDownEvent) {
    // A caller's own handler still runs; Bits UI's runs after both.
    onpointerdown?.(e);
    if (e.button !== 0) return;
    pressed = true;
    // Listened for on the window: the menu opens under the pointer, so the
    // release rarely lands on the trigger itself.
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  }
</script>

<DropdownMenuPrimitive.Trigger
  bind:ref
  class={cn("data-pressed:scale-[97%]", className)}
  data-slot="dropdown-menu-trigger"
  data-pressed={pressed ? "" : undefined}
  onpointerdown={handlePointerDown}
  {...restProps}
/>
