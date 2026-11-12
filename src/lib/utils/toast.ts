import { toast } from "svelte-sonner";
import {
  DURATION,
  EASE_IN_OUT_CSS,
  EASE_OUT_CSS,
  prefersReducedMotion,
} from "./animation.js";

type ErrorOptions = { description?: string };

/**
 * An error toast that is never shown twice. Called again with the same `id`
 * while it is still on screen, it updates that toast in place and gives it a
 * small bump, so the person sees that the second try was heard.
 *
 * ```ts
 * toastErrorOnce("asset-type-save", "Asset type not saved", {
 *   description: "There is already an asset type called Motorcycle.",
 * });
 * ```
 */
export function toastErrorOnce(
  id: string,
  title: string,
  options: ErrorOptions = {},
) {
  // svelte-sonner puts no id on the element, so a class made from the id is
  // what finds it again.
  const marker = `toast-${id}`;
  const shown = document.querySelector<HTMLElement>(
    `[data-sonner-toast].${marker}:not([data-removed="true"])`,
  );
  toast.error(title, { ...options, id, class: marker });
  if (shown) bump(shown);
}

const BUMP_ID = "toast-bump";

function bump(element: HTMLElement) {
  // The `scale` property rather than `transform`, which svelte-sonner uses to
  // place and stack its toasts; the two combine instead of fighting.
  // A bump still running is picked up from where it is, so a quick second
  // try does not jump back to the start.
  const from = Number.parseFloat(getComputedStyle(element).scale) || 1;
  for (const running of element.getAnimations()) {
    if (running.id === BUMP_ID) running.cancel();
  }

  const keyframes = prefersReducedMotion()
    ? [
        { opacity: 1, easing: EASE_OUT_CSS },
        { opacity: 0.6, offset: 0.35, easing: EASE_IN_OUT_CSS },
        { opacity: 1 },
      ]
    : [
        { scale: from, easing: EASE_OUT_CSS },
        { scale: 1.04, offset: 0.35, easing: EASE_IN_OUT_CSS },
        { scale: 1 },
      ];
  element.animate(keyframes, { id: BUMP_ID, duration: DURATION.bump });
}
