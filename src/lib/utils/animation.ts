/**
 * Shared motion values and transitions.
 *
 * The curves here are the CSS variables declared in `src/routes/layout.css`,
 * sampled in JavaScript so a Svelte transition and a plain CSS class can move
 * on exactly the same curve. Import the constants instead of writing a
 * `cubic-bezier(...)` by hand.
 */
import type { TransitionConfig } from "svelte/transition";

/** Newton-Raphson sampler for a CSS `cubic-bezier(x1, y1, x2, y2)` curve. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }

    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-6) break;
      if (x > value) low = t;
      else high = t;
      t = low + (high - low) / 2;
    }
    return sampleY(t);
  };
}

/** Strong ease-out. For anything entering or leaving. Matches `--ease-out-strong`. */
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
/** Strong ease-in-out. For something already on screen moving to a new place. */
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);

export const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
export const EASE_IN_OUT_CSS = "cubic-bezier(0.77, 0, 0.175, 1)";

export const DURATION = {
  /** Swapping the whole block: skeleton to list, list to empty message. */
  phase: 220,
  /** One row arriving, and the rows around it closing or opening a gap. */
  item: 200,
  /** Anything leaving. Always quicker than the thing arriving. */
  exit: 140,
} as const;

/** Read at the moment a transition starts, so it always reflects the current setting. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type ContentInParams = {
  duration?: number;
  delay?: number;
  /** Pixels above the resting position to start from. `0` fades without moving. */
  distance?: number;
};

/** The arriving block: settles down into place while fading in. */
export function contentIn(
  _node: Element,
  { duration = DURATION.phase, delay = 0, distance = 8 }: ContentInParams = {},
): TransitionConfig {
  const still = prefersReducedMotion();
  return {
    delay,
    duration: still ? DURATION.exit : duration,
    easing: easeOut,
    css: (t, u) =>
      still || distance === 0
        ? `opacity: ${t}`
        : `opacity: ${t}; transform: translate3d(0, ${-u * distance}px, 0)`,
  };
}

/**
 * The leaving block. It is pulled out of the flow first so the arriving block
 * is not pushed down the page while the two overlap.
 *
 * Anything already animating inside it is frozen where it stands. A skeleton
 * carries `animate-pulse`, which cycles opacity between 1 and 0.5 on a loop; a
 * block that is pulsing and fading at the same time reads as a flicker rather
 * than as one thing leaving. Pausing holds the current value instead of
 * snapping back to full opacity, so there is no step in brightness.
 */
export function contentOut(
  node: Element,
  { duration = DURATION.exit }: { duration?: number } = {},
): TransitionConfig {
  const style = (node as HTMLElement).style;
  style.position = "absolute";
  style.top = "0";
  style.insetInlineStart = "0";
  style.width = "100%";
  style.pointerEvents = "none";

  // Only what is running *inside* the block. Never the block itself, which is
  // where Svelte puts its own transition, and which may already be running an
  // entrance this outro is interrupting.
  if (typeof node.getAnimations === "function") {
    for (const animation of node.getAnimations({ subtree: true })) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (target && target !== node) animation.pause();
    }
  }

  return {
    duration,
    easing: easeOut,
    css: (t) => `opacity: ${t}`,
  };
}

/** A row arriving in a list that is already on screen. */
export function itemIn(
  _node: Element,
  { duration = DURATION.item, delay = 0 }: { duration?: number; delay?: number } = {},
): TransitionConfig {
  const still = prefersReducedMotion();
  return {
    delay,
    duration: still ? DURATION.exit : duration,
    easing: easeOut,
    css: (t, u) =>
      still
        ? `opacity: ${t}`
        : `opacity: ${t}; transform: translate3d(0, ${-u * 6}px, 0) scale(${1 - u * 0.03})`,
  };
}

/**
 * A row leaving. It only fades and shrinks a little: the movement that explains
 * the removal is the neighbouring rows closing the gap, which `animate:flip`
 * does. Nothing here touches `transform` on the element Svelte is repositioning.
 */
export function itemOut(
  _node: Element,
  { duration = DURATION.exit }: { duration?: number } = {},
): TransitionConfig {
  const still = prefersReducedMotion();
  return {
    duration,
    easing: easeOut,
    css: (t, u) =>
      still ? `opacity: ${t}` : `opacity: ${t}; transform: scale(${1 - u * 0.04})`,
  };
}

type AutoHeightOptions = {
  enabled?: boolean;
  duration?: number;
};

/**
 * Attach to a wrapper whose only child is the content that changes size. The
 * wrapper's own height then animates from the old size to the new one instead
 * of snapping, so a skeleton block giving way to three rows does not jolt the
 * rest of the page.
 *
 * Height is a layout property and cannot be done with a transform, which is the
 * same trade-off an accordion makes.
 */
export function autoHeight(wrapper: HTMLElement, options: AutoHeightOptions = {}) {
  let { enabled = true, duration = DURATION.phase } = options;

  const content = wrapper.firstElementChild as HTMLElement | null;
  if (!content) return;

  let previous = content.offsetHeight;
  let running: Animation | null = null;

  const observer = new ResizeObserver(() => {
    const next = content.offsetHeight;
    if (next === previous) return;

    const from = previous;
    previous = next;

    if (!enabled || prefersReducedMotion()) return;

    running?.cancel();
    wrapper.style.overflow = "clip";

    const animation = wrapper.animate(
      [{ height: `${from}px` }, { height: `${next}px` }],
      { duration, easing: EASE_OUT_CSS },
    );
    running = animation;

    animation.finished
      .then(() => {
        if (running === animation) {
          running = null;
          wrapper.style.overflow = "";
        }
      })
      .catch(() => {});
  });

  observer.observe(content);

  return {
    update(next: AutoHeightOptions) {
      enabled = next.enabled ?? true;
      duration = next.duration ?? DURATION.phase;
    },
    destroy() {
      observer.disconnect();
      running?.cancel();
    },
  };
}
