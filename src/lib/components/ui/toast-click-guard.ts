/**
 * Bits UI closes a dialog, sheet, or menu on any pointer press outside its
 * content. Toasts are rendered outside every panel, so pressing a toast's close
 * button used to close the open panel behind it. The returned handler cancels
 * that close when the press landed inside the toaster, then calls the caller's
 * own `onInteractOutside`, if any.
 */
export function ignoreToastClicks<E extends Event>(onInteractOutside?: (e: E) => void) {
	return (e: E) => {
		if (e.target instanceof Element && e.target.closest("[data-sonner-toaster]")) {
			e.preventDefault();
			return;
		}
		onInteractOutside?.(e);
	};
}
