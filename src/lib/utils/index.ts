import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getContext, setContext } from "svelte";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

/**
 * @example
 * export const {
 *  set: setLeaveContext,
 *  get: getLeaveContext
 * } = makeContext("leave-context", LeaveContext);
 */
export function makeContext<T>(name: string, ContextClass: new () => T) {
  const key = Symbol(name);

  return {
    set: () => setContext(key, new ContextClass()),
    get: () => getContext<T>(key),
  };
}

export function parenthesize(value: string): string {
  return `(${value})`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials<T extends { firstName: string; lastName: string }>(
  user: T,
) {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}

/**
 * A person's name as it should read on screen: the parts that are filled in,
 * in order, separated by spaces. Middle name and suffix are optional columns,
 * so they drop out when blank instead of leaving a double space.
 */
export function fullName<
  T extends {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
  },
>(user: T): string {
  return [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(" ");
}
