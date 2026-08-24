import { MediaQuery } from "svelte/reactivity";

// Matches Tailwind's `md` breakpoint (`--breakpoint-md: 48rem`), which is where
// the sidebar switches from the mobile sheet to the docked desktop panel.
const DEFAULT_MOBILE_BREAKPOINT = "48rem";

export class IsMobile extends MediaQuery {
	constructor(breakpoint: string = DEFAULT_MOBILE_BREAKPOINT) {
		// `width < x` is the exact opposite of Tailwind's `width >= x`, so every
		// window width is either mobile or desktop. Asking for `max-width: 767px`
		// instead leaves a gap: at a fractional width such as 767.2px that query is
		// false and Tailwind's `md:` is false too, so neither sidebar is shown.
		super(`width < ${breakpoint}`);
	}
}
