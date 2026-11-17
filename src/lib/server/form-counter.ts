import { db } from "$lib/server/db";
import { formCounter } from "$lib/server/db/schema";
import type { Form } from "$lib/utils/form-numbers";
import { and, eq, sql } from "drizzle-orm";

/**
 * The counts behind the numbers EMS gives out: one per form per year in
 * `form_counter`, starting over every January ("What the observed forms
 * showed" in fuel-purchase-orders.md). The Fuel page takes a withdrawal's
 * numbers here.
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
