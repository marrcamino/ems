import { getContext, setContext } from "svelte";

const OPEN_COMPLETE_KEY = Symbol("open-complete");

/**
 * Bits UI only calls `onOpenChangeComplete` when a dialog, alert dialog, or
 * sheet finishes *closing*. On open its PresenceManager sets its own
 * `shouldRender` flag and asks for the animation to be awaited in the same
 * synchronous step, before Svelte has rendered the panel, so the element it
 * needs is still null and the callback is dropped.
 *
 * The root wrappers register their callback here and the content wrappers call
 * it once the panel has finished animating in, since the content is the only
 * part that holds the element. Context resolves to the nearest ancestor that
 * set it, so a dialog mounted inside a sheet still reads its own callback.
 */
export function setOpenComplete(fn: () => void) {
	setContext(OPEN_COMPLETE_KEY, fn);
}

/**
 * Fire the registered callback once the panel has finished animating in.
 * `getNode` returns the content element, which stays null until the panel
 * mounts and only mounts on open, so this runs once per open.
 */
export function watchOpenComplete(getNode: () => HTMLElement | null) {
	const onOpenComplete = getContext<() => void>(OPEN_COMPLETE_KEY) ?? (() => {});

	$effect(() => {
		const node = getNode();
		if (!node) return;
		let cancelled = false;

		// One frame lets the enter animation attach before we wait it out.
		const frame = requestAnimationFrame(() => {
			Promise.allSettled(node.getAnimations().map((a) => a.finished)).then(() => {
				if (!cancelled) onOpenComplete();
			});
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
		};
	});
}
