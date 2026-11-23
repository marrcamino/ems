import type { PermissionKey } from "$lib/server/permissions";
import type { TransactionKind } from "./withdrawal-row";
import type { WithdrawalStatus } from "./withdrawal-status";

/**
 * What a row's actions look like for the person signed in (the
 * unavailable-actions skill): hidden, available, or unavailable with the
 * reason shown. The Fuel page draws the row from it, and the server refuses
 * with the same rule.
 */
export type Availability = { show: false } | { show: true; reason?: string };

const HIDDEN: Availability = { show: false };
const AVAILABLE: Availability = { show: true };
const unavailable = (reason: string): Availability => ({ show: true, reason });

export const isAllowed = (a: Availability) => a.show && !a.reason;

/**
 * Approve, Complete, Edit, and Cancel on one transaction.
 *
 * - Approve: `fuel:approve`, on a withdrawal Waiting for approval (MPP-81).
 * - Complete: `fuel:complete`, on what is Out or Incomplete (point 9 of
 *   "Recording a fuel issuance").
 * - Edit and Cancel: `fuel:complete` at any step; `fuel:record` only before
 *   GSU has acted on it, which is a withdrawal still Waiting for approval or
 *   a trip still Out (decided by the owner, 23 November 2026). A Complete
 *   transaction is never cancelled, since its fuel was taken.
 */
export function transactionActions(
  row: { kind: TransactionKind; status: WithdrawalStatus; poClosed: boolean },
  can: (key: PermissionKey) => boolean,
) {
  const gsu = can("fuel:complete");
  const records = can("fuel:record");
  const { kind, status } = row;
  const beforeGsu =
    status === "waiting" || (kind !== "withdrawal" && status === "out");
  const gsuOnly =
    kind === "withdrawal" && status === "out"
      ? "GSU has approved this slip. Ask GSU to change it."
      : "GSU has completed this. Ask GSU to change it.";

  const approve =
    can("fuel:approve") && kind === "withdrawal" && status === "waiting"
      ? AVAILABLE
      : HIDDEN;

  let complete = HIDDEN;
  if (
    gsu &&
    (status === "waiting" || status === "out" || status === "incomplete")
  ) {
    complete =
      status === "waiting"
        ? unavailable(
            "The slip is still waiting for approval. Mark it approved first.",
          )
        : AVAILABLE;
  }

  // A closed PO locks its withdrawals: reopening it is the way to fix one
  // ("What a closed PO locks").
  const closed =
    "Its PO is closed. Reopen the PO on the Purchase Orders page first.";

  // A cancelled one keeps its Edit button, unavailable, so the row keeps its
  // shape; its Cancelled badge already says why (decided by the owner,
  // 23 November 2026).
  let edit = HIDDEN;
  if ((gsu || records) && status === "cancelled") {
    edit = unavailable("It was cancelled, so it cannot be changed.");
  } else if (gsu || records) {
    edit = row.poClosed
      ? unavailable(closed)
      : gsu || beforeGsu
        ? AVAILABLE
        : unavailable(gsuOnly);
  }

  let cancel = HIDDEN;
  if ((gsu || records) && (status === "waiting" || status === "out")) {
    cancel = row.poClosed
      ? unavailable(closed)
      : gsu || beforeGsu
        ? AVAILABLE
        : unavailable(gsuOnly);
  }

  return { approve, complete, edit, cancel };
}

export type TransactionAction = keyof ReturnType<typeof transactionActions>;
