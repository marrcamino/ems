import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { formCounter, risReservation } from "$lib/server/db/schema";
import { FORMS, formNumber, type Form } from "$lib/utils/form-numbers";
import { getLocalTimeZone, today } from "@internationalized/date";
import { fail, type Actions } from "@sveltejs/kit";
import { and, eq, like, sql } from "drizzle-orm";

/**
 * The counts behind the numbers EMS gives out: one per form per year in
 * `form_counter`, starting over every January ("What the observed forms
 * showed" in fuel-purchase-orders.md). The Fuel page takes a withdrawal's
 * numbers here, and the RIS Numbers page takes the RIS numbers it reserves.
 */

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The next number of a form for the year. Raising the count locks its row
 * until the caller's transaction ends, so a second save waits for the first
 * and gets the number after it; a save that fails gives its number back.
 */
export async function nextNumber(tx: Tx, form: Form, year: number) {
  await tx
    .insert(formCounter)
    .values({ form, year, lastNumber: 1 })
    .onDuplicateKeyUpdate({
      set: { lastNumber: sql`${formCounter.lastNumber} + 1` },
    });
  const [row] = await tx
    .select({ lastNumber: formCounter.lastNumber })
    .from(formCounter)
    .where(and(eq(formCounter.form, form), eq(formCounter.year, year)))
    .for("update");
  return row.lastNumber;
}

/**
 * The next RIS number for a form dated `day`. When the newest RIS number
 * of the year is a reservation marked not used, that number is given again
 * with the month of `day`, and its reservation is deleted, so unused
 * numbers do not pile up (decided by the owner, 17 November 2026; point 6.5
 * of "Recording a fuel issuance"). A newer number, or a new year, means a
 * new number. The count row is locked first, so two saves at once cannot
 * both take the same one.
 *
 * Returns the number in full, and the deleted reservation's id when one
 * was reused.
 */
export async function nextRisNumber(
  tx: Tx,
  day: string,
  { reuse }: { reuse: boolean },
) {
  const year = Number(day.slice(0, 4));
  const [counter] = await tx
    .select({ lastNumber: formCounter.lastNumber })
    .from(formCounter)
    .where(and(eq(formCounter.form, "ris"), eq(formCounter.year, year)))
    .for("update");

  if (reuse && counter && counter.lastNumber > 0) {
    const running = String(counter.lastNumber).padStart(3, "0");
    const [unused] = await tx
      .select({ id: risReservation.risReservationPk })
      .from(risReservation)
      .where(
        and(
          like(risReservation.risNumber, `${year}-__-${running}`),
          eq(risReservation.status, "not_used"),
        ),
      )
      .for("update");
    if (unused) {
      await tx
        .delete(risReservation)
        .where(eq(risReservation.risReservationPk, unused.id));
      return {
        risNumber: formNumber(day, counter.lastNumber),
        reusedId: unused.id,
      };
    }
  }

  return {
    risNumber: formNumber(day, await nextNumber(tx, "ris", year)),
    reusedId: null,
  };
}

/**
 * Whether the starting numbers were set at go-live, which is the same as
 * whether EMS has ever given out a number: setting them writes the count
 * rows themselves (point 6.6 of "Recording a fuel issuance"). Until then a
 * save that needs a number is refused, so the first withdrawal cannot start
 * a count at 001 and lock it.
 */
export async function cutoverDone() {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(formCounter)
    .limit(1);
  return row !== undefined;
}

/** The refusal every save that needs a number returns before the cutover. */
export const CUTOVER_PENDING =
  "The starting numbers have not been set yet. Ask GSU to set them first.";

/** The running number can reach 4 digits ("What the observed forms showed"). */
const LAST_NUMBER_MAX = 9999;

/**
 * The one-time step at go-live, shared by the pages that show the note. It
 * writes the four count rows of the current year, so a second run finds
 * them and is refused.
 */
export const startingNumbersActions = {
  setStartingNumbers: async ({ request, locals }) => {
    if (!can(locals.permissions, "fuel:set_starting_numbers")) {
      return fail(403, { error: "You do not have permission to do this." });
    }

    // What is typed is the first number EMS gives out, so the count is
    // stored one below it (the owner, 17 November 2026: typing 1 must mean
    // that the next number is 001).
    const form = await request.formData();
    const numbers = {} as Record<Form, number>;
    for (const name of FORMS) {
      const value = Number(form.get(name));
      if (!Number.isInteger(value) || value < 1 || value > LAST_NUMBER_MAX) {
        return fail(400, {
          error: `Enter each first number, from 1 to ${LAST_NUMBER_MAX}.`,
        });
      }
      numbers[name] = value - 1;
    }

    const day = today(getLocalTimeZone()).toString();
    const year = Number(day.slice(0, 4));
    const refusal = {
      error:
        "A number was already given out, so the starting numbers cannot be changed.",
      cutoverDone: true,
    };
    if (await cutoverDone()) return fail(409, refusal);
    try {
      await db.insert(formCounter).values(
        FORMS.map((name) => ({
          form: name,
          year,
          lastNumber: numbers[name],
        })),
      );
    } catch (err) {
      if ((err as { errno?: number })?.errno === 1062)
        return fail(409, refusal);
      throw err;
    }

    const next = {} as Record<Form, string>;
    for (const name of FORMS) next[name] = formNumber(day, numbers[name] + 1);
    return { success: true, next };
  },
} satisfies Actions;
