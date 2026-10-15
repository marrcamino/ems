import { getContext, setContext } from "svelte";

export type StepperOrientation = "horizontal" | "vertical";
export type StepStatus = "done" | "current" | "upcoming";

/**
 * Shared between Stepper.Root and each Stepper.Item inside it.
 *
 * Items register in the order they are written, and that order is their step
 * number. So every item has to be rendered all the time, never inside an
 * `{#if}`: one that appears later would be numbered last.
 */
export class StepperState {
  #getCurrent: () => number;
  #setCurrent: (index: number) => void;
  #getOrientation: () => StepperOrientation;
  #getAllowJumpAhead: () => boolean;

  // Symbols, not objects, so indexOf works through the state proxy.
  #keys = $state<symbol[]>([]);

  constructor(options: {
    getCurrent: () => number;
    setCurrent: (index: number) => void;
    getOrientation: () => StepperOrientation;
    getAllowJumpAhead: () => boolean;
  }) {
    this.#getCurrent = options.getCurrent;
    this.#setCurrent = options.setCurrent;
    this.#getOrientation = options.getOrientation;
    this.#getAllowJumpAhead = options.getAllowJumpAhead;
  }

  get current() {
    return this.#getCurrent();
  }

  set current(index: number) {
    this.#setCurrent(index);
  }

  get orientation() {
    return this.#getOrientation();
  }

  get allowJumpAhead() {
    return this.#getAllowJumpAhead();
  }

  register(key: symbol) {
    this.#keys.push(key);
  }

  unregister(key: symbol) {
    this.#keys = this.#keys.filter((k) => k !== key);
  }

  indexOf(key: symbol) {
    return this.#keys.indexOf(key);
  }
}

/** What Stepper.Title and Stepper.Description need from their item. */
export type StepperItemState = {
  readonly status: StepStatus;
  readonly error: boolean;
};

const ROOT_KEY = Symbol("stepper");
const ITEM_KEY = Symbol("stepper-item");

export function setStepper(state: StepperState) {
  return setContext(ROOT_KEY, state);
}

export function getStepper() {
  const state = getContext<StepperState | undefined>(ROOT_KEY);
  if (!state) {
    throw new Error("Stepper.Item must be placed inside Stepper.Root.");
  }
  return state;
}

export function setStepperItem(state: StepperItemState) {
  return setContext(ITEM_KEY, state);
}

export function getStepperItem() {
  const state = getContext<StepperItemState | undefined>(ITEM_KEY);
  if (!state) {
    throw new Error(
      "Stepper.Header, Title and Description must be placed inside Stepper.Item.",
    );
  }
  return state;
}
