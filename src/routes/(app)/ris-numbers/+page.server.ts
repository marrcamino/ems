import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import {
  asset,
  employee,
  formCounter,
  fuelIssuance,
  risReservation,
  user,
} from "$lib/server/db/schema";
import {
  CUTOVER_PENDING,
  cutoverDone,
  nextRisNumber,
  startingNumbersActions,
} from "$lib/server/form-counter";
import { fullName } from "$lib/utils";
import { runningWidth, shortNumber } from "$lib/utils/form-numbers";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error, fail } from "@sveltejs/kit";
import { and, eq, inArray, isNotNull, like } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import {
  newerThan,
  notNewestMessage,
  PURPOSE_MAX,
  REASON_MAX,
  type RisRow,
} from "./ris-row";

/**
 * The RIS Numbers page: the numbers GSU reserves for supplies that are not
 * fuel, beside the ones the fuel withdrawals took, so the whole sequence
 * shows with no gaps (point 6 of "Recording a fuel issuance" in
 * fuel-purchase-orders.md).
 */

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "ris_numbers:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const [rows, numbersSet] = await Promise.all([selectRows(), cutoverDone()]);
  return { rows, cutoverDone: numbersSet };
};

/** MySQL reports a broken rule by number: 1062 is a duplicate, 1213 a deadlock. */
function mysqlErrno(err: unknown) {
  return (err as { errno?: number })?.errno;
}

const text = (value: unknown) => String(value ?? "").trim();

/** The name of the employee behind each login. */
async function namesOf(userPks: number[]) {
  const names = new Map<number, string>();
  if (userPks.length === 0) return names;

  const rows = await db
    .select({
      userPk: user.userPk,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      suffix: employee.suffix,
    })
    .from(user)
    .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
    .where(inArray(user.userPk, userPks));
  for (const { userPk, ...name } of rows) names.set(userPk, fullName(name));
  return names;
}

function selectReservations() {
  return db
    .select({
      id: risReservation.risReservationPk,
      risNumber: risReservation.risNumber,
      date: risReservation.reservedOn,
      purpose: risReservation.purpose,
      status: risReservation.status,
      notUsedReason: risReservation.notUsedReason,
      userPk: risReservation.reservedByFk,
    })
    .from(risReservation);
}

type Reservation = Awaited<ReturnType<typeof selectReservations>>[number];

function reservationRow(r: Reservation, names: Map<number, string>): RisRow {
  return {
    id: r.id,
    risNumber: r.risNumber,
    date: r.date,
    purpose: r.purpose,
    status: r.status,
    notUsedReason: r.notUsedReason,
    reservedBy: names.get(r.userPk) ?? "—",
    controlNumber: null,
    cancelled: false,
  };
}

/** Every RIS number given out: the reservations and the fuel withdrawals'. */
async function selectRows(): Promise<RisRow[]> {
  const [reservations, withdrawals] = await Promise.all([
    selectReservations(),
    db
      .select({
        risNumber: fuelIssuance.risNumber,
        date: fuelIssuance.fileDate,
        controlNumber: fuelIssuance.controlNumber,
        status: fuelIssuance.status,
        userPk: fuelIssuance.createdByFk,
        assetName: asset.assetName,
        plateNumber: asset.plateNumber,
        propertyNumber: asset.propertyNumber,
      })
      .from(fuelIssuance)
      .innerJoin(asset, eq(fuelIssuance.assetFk, asset.assetPk))
      .where(isNotNull(fuelIssuance.risNumber)),
  ]);

  const userPks = new Set(reservations.map((r) => r.userPk));
  for (const w of withdrawals) if (w.userPk !== null) userPks.add(w.userPk);
  const names = await namesOf([...userPks]);

  return [
    ...reservations.map((r) => reservationRow(r, names)),
    ...withdrawals.map((w): RisRow => ({
      id: null,
      risNumber: w.risNumber ?? "",
      date: w.date,
      purpose: `${w.assetName} (${w.plateNumber ?? w.propertyNumber})`,
      status: "fuel",
      notUsedReason: null,
      reservedBy: w.userPk === null ? "—" : (names.get(w.userPk) ?? "—"),
      controlNumber: w.controlNumber,
      cancelled: w.status === "cancelled",
    })),
  ];
}

async function readBack(id: number): Promise<RisRow | null> {
  const [row] = await selectReservations().where(
    eq(risReservation.risReservationPk, id),
  );
  if (!row) return null;
  return reservationRow(row, await namesOf([row.userPk]));
}

function reservationId(form: FormData) {
  const id = Number(form.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const NO_PERMISSION = "You do not have permission to do this.";
const GONE = "That number is no longer there. Refresh the page and try again.";
const PURPOSE_ERROR = `Enter what the RIS is for, up to ${PURPOSE_MAX} characters.`;

export const actions: Actions = {
  reserve: async ({ request, locals }) => {
    if (!can(locals.permissions, "ris_numbers:manage")) {
      return fail(403, { error: NO_PERMISSION });
    }
    const userPk = locals.user?.userPk;
    if (!userPk) return fail(401, { error: "Sign in again, then try again." });

    const form = await request.formData();
    const purpose = text(form.get("purpose"));
    if (!purpose || purpose.length > PURPOSE_MAX) {
      return fail(400, { error: PURPOSE_ERROR });
    }
    // The dialog offers the newest not-used number first; "false" asks for
    // a new one. If it was taken in the meantime, a new one is given anyway,
    // and the dialog shows the number that was really given.
    const reuse = form.get("reuse") !== "false";
    if (!(await cutoverDone())) return fail(409, { error: CUTOVER_PENDING });

    // Always today, because the number is reserved before the paper is
    // written (point 6.2).
    const day = today(getLocalTimeZone()).toString();

    // Two saves at the same moment can trip over each other while the
    // year's counter is first made; the second simply tries again.
    for (let attempt = 1; ; attempt++) {
      try {
        const { id, reusedId } = await db.transaction(async (tx) => {
          const { risNumber, reusedId } = await nextRisNumber(tx, day, {
            reuse,
          });
          const [result] = await tx.insert(risReservation).values({
            risNumber,
            reservedOn: day,
            purpose,
            reservedByFk: userPk,
          });
          return { id: result.insertId, reusedId };
        });
        return { success: true, newRow: await readBack(id), reusedId };
      } catch (err) {
        const errno = mysqlErrno(err);
        if ((errno === 1213 || errno === 1062) && attempt < 3) continue;
        throw err;
      }
    }
  },

  update: async ({ request, locals }) => {
    if (!can(locals.permissions, "ris_numbers:manage")) {
      return fail(403, { error: NO_PERMISSION });
    }
    const form = await request.formData();
    const id = reservationId(form);
    if (!id) return fail(400, { error: GONE });
    const purpose = text(form.get("purpose"));
    if (!purpose || purpose.length > PURPOSE_MAX) {
      return fail(400, { error: PURPOSE_ERROR });
    }

    await db
      .update(risReservation)
      .set({ purpose, updatedAt: new Date() })
      .where(eq(risReservation.risReservationPk, id));
    const updatedRow = await readBack(id);
    if (!updatedRow) return fail(404, { error: GONE });
    return { success: true, updatedRow };
  },

  markNotUsed: async ({ request, locals }) => {
    if (!can(locals.permissions, "ris_numbers:manage")) {
      return fail(403, { error: NO_PERMISSION });
    }
    const form = await request.formData();
    const id = reservationId(form);
    if (!id) return fail(400, { error: GONE });
    const reason = text(form.get("reason"));
    if (!reason || reason.length > REASON_MAX) {
      return fail(400, {
        error: `Enter the reason, up to ${REASON_MAX} characters.`,
      });
    }

    await db
      .update(risReservation)
      .set({ status: "not_used", notUsedReason: reason, updatedAt: new Date() })
      .where(eq(risReservation.risReservationPk, id));
    const updatedRow = await readBack(id);
    if (!updatedRow) return fail(404, { error: GONE });
    return { success: true, updatedRow };
  },

  markReserved: async ({ request, locals }) => {
    if (!can(locals.permissions, "ris_numbers:manage")) {
      return fail(403, { error: NO_PERMISSION });
    }
    const id = reservationId(await request.formData());
    if (!id) return fail(400, { error: GONE });

    await db
      .update(risReservation)
      .set({ status: "reserved", notUsedReason: null, updatedAt: new Date() })
      .where(eq(risReservation.risReservationPk, id));
    const updatedRow = await readBack(id);
    if (!updatedRow) return fail(404, { error: GONE });
    return { success: true, updatedRow };
  },

  /**
   * Deletes a reservation only while it is the newest RIS number of its year,
   * and takes the count back by one, so the next reservation gets the number
   * again. The count row is locked first, so a withdrawal or a reservation
   * saved at the same moment waits, and the check sees it.
   */
  remove: async ({ request, locals }) => {
    if (!can(locals.permissions, "ris_numbers:manage")) {
      return fail(403, { error: NO_PERMISSION });
    }
    const id = reservationId(await request.formData());
    if (!id) return fail(400, { error: GONE });

    const outcome = await db.transaction(async (tx) => {
      const [reservation] = await tx
        .select({ risNumber: risReservation.risNumber })
        .from(risReservation)
        .where(eq(risReservation.risReservationPk, id))
        .for("update");
      if (!reservation) return { error: GONE };

      const year = Number(reservation.risNumber.slice(0, 4));
      const running = Number(reservation.risNumber.split("-").at(-1));
      const [counter] = await tx
        .select({ lastNumber: formCounter.lastNumber })
        .from(formCounter)
        .where(and(eq(formCounter.form, "ris"), eq(formCounter.year, year)))
        .for("update");

      if (!counter || counter.lastNumber !== running) {
        const prefix = `${year}-%`;
        const [reserved, fuel] = await Promise.all([
          tx
            .select({ risNumber: risReservation.risNumber })
            .from(risReservation)
            .where(like(risReservation.risNumber, prefix)),
          tx
            .select({ risNumber: fuelIssuance.risNumber })
            .from(fuelIssuance)
            .where(like(fuelIssuance.risNumber, prefix)),
        ]);
        const all = [...reserved, ...fuel]
          .map((r) => r.risNumber)
          .filter((n): n is string => n !== null);
        const newer = newerThan(reservation.risNumber, all);
        return {
          error: newer
            ? notNewestMessage(shortNumber(newer, runningWidth(all)))
            : "A newer RIS number was given out after it, and only the newest number can be deleted. Mark this one not used instead.",
          notNewest: true,
        };
      }

      await tx
        .delete(risReservation)
        .where(eq(risReservation.risReservationPk, id));
      await tx
        .update(formCounter)
        .set({ lastNumber: running - 1 })
        .where(and(eq(formCounter.form, "ris"), eq(formCounter.year, year)));
      return null;
    });

    if (outcome) return fail(409, outcome);
    return { success: true, deletedId: id };
  },

  ...startingNumbersActions,
};
