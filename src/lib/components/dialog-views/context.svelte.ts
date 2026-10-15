import { getContext, setContext } from "svelte";

type Size = { width: number; height: number };

type ViewEntry = {
  node: HTMLElement | null;
  title: () => string;
  description: () => string | undefined;
};

/**
 * Shared between DialogViews.Content and each DialogViews.View inside it.
 *
 * Views register in the order they are written, and that order is what
 * decides the direction of a slide: a view later in the list comes in from
 * the right, an earlier one from the left. That is why every view has to be
 * rendered all the time, never inside an `{#if}`.
 */
export class DialogViewsState {
  #getView: () => string;
  #getTitled: () => boolean;
  #names: string[] = [];
  #entries = new Map<string, ViewEntry>();

  /** Each view's laid-out size, kept up to date by a ResizeObserver. */
  sizes = $state<Record<string, Size | null>>({});

  constructor(getView: () => string, getTitled: () => boolean = () => false) {
    this.#getView = getView;
    this.#getTitled = getTitled;
  }

  /**
   * Whether DialogViews.Content was given its own title. If so, each view's
   * heading is a real heading; if not, it repeats the dialog's title and is
   * hidden from screen readers.
   */
  get titled() {
    return this.#getTitled();
  }

  get view() {
    return this.#getView();
  }

  get activeIndex() {
    return this.#names.indexOf(this.view);
  }

  get activeSize() {
    return this.sizes[this.view] ?? null;
  }

  get title() {
    return this.#entries.get(this.view)?.title() ?? "";
  }

  get description() {
    return this.#entries.get(this.view)?.description();
  }

  indexOf(name: string) {
    return this.#names.indexOf(name);
  }

  nodeOf(name: string) {
    return this.#entries.get(name)?.node ?? null;
  }

  register(name: string, entry: Omit<ViewEntry, "node">) {
    if (this.#entries.has(name)) {
      throw new Error(`DialogViews: two views are named "${name}".`);
    }
    this.#names.push(name);
    this.#entries.set(name, { ...entry, node: null });
  }

  /**
   * Called when a view unmounts. The dialog's content unmounts every time it
   * closes while DialogViews.Content itself stays, so the views register
   * again, in order, the next time it opens.
   */
  unregister(name: string) {
    this.#names = this.#names.filter((n) => n !== name);
    this.#entries.delete(name);
  }

  setNode(name: string, node: HTMLElement | null) {
    const entry = this.#entries.get(name);
    if (entry) entry.node = node;
  }
}

const KEY = Symbol("dialog-views");

export function setDialogViews(state: DialogViewsState) {
  return setContext(KEY, state);
}

export function getDialogViews() {
  const state = getContext<DialogViewsState | undefined>(KEY);
  if (!state) {
    throw new Error("DialogViews.View must be placed inside DialogViews.Content.");
  }
  return state;
}
