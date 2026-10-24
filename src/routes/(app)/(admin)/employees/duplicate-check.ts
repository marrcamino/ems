/**
 * Working out whether the person being entered is already in the system.
 *
 * The check is anchored on the birth date, not on the name. A birth date never
 * changes: not when somebody marries and takes a new surname, not when they
 * leave the office and come back years later. A name does both of those, which
 * is why matching on the name alone was never reliable — and why the earlier
 * attempt at this, which read the sex field to decide whether to allow for a
 * changed surname, is not repeated here. One mistyped sex silently changed how
 * the whole check behaved.
 *
 * The same rules run in two places. The dialog runs them against the rows it
 * has already loaded, so the admin is told before pressing save, and the server
 * runs them again against the table, because the dialog can be bypassed.
 */

import { TENURE_STATUS_LABELS, type TenureStatus } from "./labels";

/**
 * How strongly the person being entered resembles somebody already recorded.
 *
 * - `exact` — same first name, same last name, same birth date. The same
 *   person. A second record is never created for this.
 * - `shared-birth-date` — the birth dates agree but the names do not match
 *   exactly. Usually a surname changed after marriage; sometimes a first name
 *   written differently, such as "Ma." for "Maria". Occasionally it really is
 *   two people who happen to share a birthday.
 * - `unknown-birth-date` — the names match exactly, but one of the two records
 *   has no birth date, so there is nothing to tell them apart with.
 */
export type DuplicateKind = "exact" | "shared-birth-date" | "unknown-birth-date";

/** Strongest first. A single exact match outranks any number of weaker ones. */
const KIND_RANK: Record<DuplicateKind, number> = {
  exact: 0,
  "shared-birth-date": 1,
  "unknown-birth-date": 2,
};

/** The least that has to be known about a stored person to compare them. */
export interface ComparablePerson {
  employeePk: number;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

/** The person being entered, who does not have a row yet. */
export interface CandidatePerson {
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

export interface DuplicateFinding<T extends ComparablePerson> {
  kind: DuplicateKind;
  person: T;
}

/**
 * Names are compared with the surrounding and repeated spaces removed and the
 * case ignored, so "  maria  " and "Maria" are the same person. Nothing
 * cleverer than that: anything fuzzier would start guessing.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameName(
  candidate: CandidatePerson,
  person: ComparablePerson,
): boolean {
  return (
    normalize(candidate.firstName) === normalize(person.firstName) &&
    normalize(candidate.lastName) === normalize(person.lastName)
  );
}

function compare(
  candidate: CandidatePerson,
  person: ComparablePerson,
): DuplicateKind | null {
  const namesMatch = sameName(candidate, person);
  const bothDated = candidate.birthDate !== null && person.birthDate !== null;
  const datesMatch = bothDated && candidate.birthDate === person.birthDate;

  if (datesMatch && namesMatch) return "exact";
  if (datesMatch) return "shared-birth-date";
  if (namesMatch && !bothDated) return "unknown-birth-date";

  // Same name but a different birth date is two different people. That is a
  // normal thing in a small office and is deliberately not flagged.
  return null;
}

/**
 * The strongest match among the people given, or null if this person looks new.
 *
 * `ignoreEmployeePk` leaves one row out of the comparison — the record being
 * edited, which would otherwise always match itself.
 */
export function findDuplicate<T extends ComparablePerson>(
  candidate: CandidatePerson,
  people: readonly T[],
  ignoreEmployeePk?: number | null,
): DuplicateFinding<T> | null {
  if (!normalize(candidate.firstName) || !normalize(candidate.lastName)) {
    return null;
  }

  let best: DuplicateFinding<T> | null = null;

  for (const person of people) {
    if (ignoreEmployeePk != null && person.employeePk === ignoreEmployeePk) {
      continue;
    }

    const kind = compare(candidate, person);
    if (kind === null) continue;

    if (best === null || KIND_RANK[kind] < KIND_RANK[best.kind]) {
      best = { kind, person };
      if (kind === "exact") break;
    }
  }

  return best;
}

/**
 * A birth date as it should read in a sentence — "12 March 1990".
 *
 * Read at UTC midnight so the day cannot shift, the same reason the column is
 * stored as a plain "YYYY-MM-DD" string rather than as a date object.
 */
export function formatBirthDate(birthDate: string | null): string | null {
  if (!birthDate) return null;

  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Juan Dela Cruz, born 12 March 1990" — or just the name, if none is known. */
export function nameWithBirthDate(person: {
  firstName: string;
  lastName: string;
  birthDate: string | null;
}): string {
  const name = `${person.firstName} ${person.lastName}`.trim();
  const born = formatBirthDate(person.birthDate);
  return born ? `${name}, born ${born}` : name;
}

/**
 * The one-line summary shown under "Already recorded as", so the two people
 * can be compared without leaving the form.
 */
export function describePerson(person: {
  positionTitle: string;
  orgUnitName?: string | null;
  tenureStatus: TenureStatus;
}): string {
  return [
    person.positionTitle,
    person.orgUnitName ?? "Not assigned",
    TENURE_STATUS_LABELS[person.tenureStatus],
  ].join(" · ");
}

/**
 * The message shown when the same person is already recorded and still
 * employed. Written here rather than in the dialog because the server refuses
 * this case too and both have to say the same thing.
 */
export function alreadyEmployedMessage(person: {
  firstName: string;
  lastName: string;
  birthDate: string | null;
}): string {
  return (
    `${nameWithBirthDate(person)} is already recorded and is still employed. ` +
    `The same person cannot be added twice. If you think this is a different ` +
    `person, please check both records. The birth date on one of them may ` +
    `have been typed wrongly.`
  );
}

/**
 * The same refusal on the edit form, where nothing is being added and the
 * "cannot be added twice" wording would not make sense.
 */
export function wouldDuplicateMessage(person: {
  firstName: string;
  lastName: string;
  birthDate: string | null;
}): string {
  return (
    `These changes would make this person the same as ${nameWithBirthDate(person)}, ` +
    `who is already recorded. If you think they are two different people, ` +
    `please check both records. The birth date on one of them may have been ` +
    `typed wrongly.`
  );
}
