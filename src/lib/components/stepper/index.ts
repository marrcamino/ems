/**
 * A row (or column) of numbered steps, for a form that is filled in over
 * several screens. Clicking a done step moves `current` back to it.
 *
 * ```svelte
 * <Stepper.Root bind:current>
 *   <Stepper.Item>
 *     <Stepper.Header>
 *       <Stepper.Title>Profile</Stepper.Title>
 *       <Stepper.Description>Your name and photo</Stepper.Description>
 *     </Stepper.Header>
 *   </Stepper.Item>
 *   <Stepper.Item loading={saving} error={!!nameError}>
 *     <Stepper.Header>
 *       <Stepper.Title>Workspace</Stepper.Title>
 *       <Stepper.Description>{nameError || "Name and web address"}</Stepper.Description>
 *     </Stepper.Header>
 *   </Stepper.Item>
 *   <Stepper.Item icon={Users}>…</Stepper.Item>
 * </Stepper.Root>
 * ```
 *
 * Every Item has to be rendered all the time, never inside an `{#if}`: the
 * order they are written in is their step number.
 */
import Description from "./stepper-description.svelte";
import Header from "./stepper-header.svelte";
import Item from "./stepper-item.svelte";
import Root from "./stepper-root.svelte";
import Title from "./stepper-title.svelte";

export { Description, Header, Item, Root, Title };
