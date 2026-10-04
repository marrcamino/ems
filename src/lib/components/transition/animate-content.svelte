<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import { fade, slide } from "svelte/transition";

  type TransitionEvent = CustomEvent<null> & {
    currentTarget: EventTarget & HTMLDivElement;
  };

  interface Props {
    children: Snippet;
    onintrostart?: (e: TransitionEvent) => void;
    onoutrostart?: (e: TransitionEvent) => void;
    onintroend?: (e: TransitionEvent) => void;
    onoutroend?: (e: TransitionEvent) => void;
    animationDuration?: number;
    /** This will override the prop `animationDuration`*/
    outerAnimationDuration?: number;
    /** This will override the prop `animationDuration`*/
    innerAnimationDuration?: number;

    delay?: number;
    /** Defaults to `400`*/
    innerDelay?: number;
    /** Defaults to `300`*/
    outerDelay?: number;
    /**
     * Classes for the outer box, the one that slides. Width belongs here: in a
     * centred flex column this box otherwise shrinks to its content.
     */
    class?: ClassValue;
  }

  let { children, class: className, ...restProps }: Props = $props();

  let innerDuration = $derived(
    restProps.innerAnimationDuration ?? restProps.animationDuration ?? 300,
  );
  let outerDuration = $derived(
    restProps.outerAnimationDuration ?? restProps.animationDuration ?? 300,
  );

  // DELAYS

  let innerDelay = $derived(restProps.innerDelay ?? restProps.delay ?? 0);
  let outerDelay = $derived(restProps.outerDelay ?? restProps.delay ?? 300);
</script>

<div
  class={className}
  transition:slide={{ axis: "y", delay: outerDelay, duration: innerDuration }}
>
  <div
    in:fade={{ delay: innerDelay, duration: outerDuration }}
    out:fade
    {...restProps}
  >
    {@render children()}
  </div>
</div>
