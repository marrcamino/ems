/**
 * The stored values for each of the employee record's fixed choices, and how
 * each one should read on screen.
 *
 * The values here must match the enums in
 * `src/lib/server/db/schema/employee.ts`. They live in one file so a label is
 * never written twice — the table, the filter dropdown, and the editor all
 * read from here.
 */

export const SEX_VALUES = ["male", "female"] as const;

export const SEX_LABELS: Record<(typeof SEX_VALUES)[number], string> = {
  male: "Male",
  female: "Female",
};

export const CIVIL_STATUS_VALUES = [
  "single",
  "married",
  "widowed",
  "separated",
  "annulled",
] as const;

export const CIVIL_STATUS_LABELS: Record<
  (typeof CIVIL_STATUS_VALUES)[number],
  string
> = {
  single: "Single",
  married: "Married",
  widowed: "Widowed",
  separated: "Separated",
  annulled: "Annulled",
};

/**
 * How the person is hired. The first five are Civil Service Commission
 * categories; Contract of Service and Job Order sit outside the Civil Service
 * and are engaged under a separate circular, which is why they are spelled
 * out in full rather than left as initials.
 */
export const TENURE_STATUS_VALUES = [
  "permanent",
  "temporary",
  "casual",
  "coterminous",
  "contractual",
  "cos",
  "job_order",
] as const;

export type TenureStatus = (typeof TENURE_STATUS_VALUES)[number];

export const TENURE_STATUS_LABELS: Record<TenureStatus, string> = {
  permanent: "Permanent",
  temporary: "Temporary",
  casual: "Casual",
  coterminous: "Coterminous",
  contractual: "Contractual",
  cos: "Contract of Service",
  job_order: "Job Order",
};

/** The short form for the table, where the full name of a tenure won't fit. */
export const TENURE_STATUS_SHORT: Record<TenureStatus, string> = {
  permanent: "Permanent",
  temporary: "Temporary",
  casual: "Casual",
  coterminous: "Coterminous",
  contractual: "Contractual",
  cos: "COS",
  job_order: "Job Order",
};

export const EMPLOYMENT_STATUS_VALUES = ["active", "separated"] as const;

export const EMPLOYMENT_STATUS_LABELS: Record<
  (typeof EMPLOYMENT_STATUS_VALUES)[number],
  string
> = {
  active: "Employed",
  separated: "No longer employed",
};

export const NOT_ANSWERED = "—";

/** A stored value turned into its label, for a field that may be blank. */
export function labelOf<T extends string>(
  value: T | null,
  labels: Record<T, string>,
): string {
  return value === null ? NOT_ANSWERED : labels[value];
}
