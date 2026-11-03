/**
 * The status of a withdrawal or a trip, with its colour (point 9 of
 * "Recording a fuel issuance" in fuel-purchase-orders.md).
 */
export const WITHDRAWAL_STATUSES = [
  "waiting",
  "out",
  "complete",
  "incomplete",
  "cancelled",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  waiting: "Waiting for approval",
  out: "Out",
  complete: "Complete",
  incomplete: "Incomplete",
  cancelled: "Cancelled",
};

/** Gray, blue, green, yellow, and the destructive colour, in that order. */
export const STATUS_BADGE: Record<WithdrawalStatus, string> = {
  waiting: "bg-secondary text-secondary-foreground",
  out: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  incomplete:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  cancelled: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};
