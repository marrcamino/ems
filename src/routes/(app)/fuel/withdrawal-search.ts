import type { SampleWithdrawal } from "./sample-withdrawals.js";
import { shortNumber } from "./short-numbers.js";

/**
 * The search box of the Withdrawals list (decided by the user, 28 October
 * 2026). It looks at the asset name, the remarks, the driver, and the form
 * numbers, and at nothing else: litres and pesos are not names of anything,
 * and the office has its own filter.
 *
 * Every word must match somewhere in the row, so "hilux libjo" finds the
 * Hilux rows whose remarks mention Libjo. A form number matches only as the
 * list shows it, `10-093`, without the year, so typing "2026" does not find
 * every number of the year.
 */

const FORM_NUMBERS = {
  cn: "controlNumber",
  ws: "wsNumber",
  ris: "risNumber",
  dtt: "tripTicketNumber",
} as const;

type FormLabel = keyof typeof FORM_NUMBERS;

type Term = { text: string; form?: FormLabel };

function isFormLabel(word: string): word is FormLabel {
  return word in FORM_NUMBERS;
}

/**
 * The words of a search. A form's label in front of a number, as the list
 * shows it ("WS 10-093"), limits that number to that form, because the WS
 * and DTT numbers are often the same.
 */
function terms(search: string): Term[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const result: Term[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!isFormLabel(word)) {
      result.push({ text: word });
      continue;
    }
    // A label with no number after it yet is skipped, so the list does not
    // go empty while the number is still being typed.
    if (i + 1 < words.length) result.push({ text: words[++i], form: word });
  }
  return result;
}

/** The number as the list shows it, without the year. */
function numberMatches(full: string | null, text: string, width: number) {
  return full !== null && shortNumber(full, width).includes(text);
}

function matches(row: SampleWithdrawal, term: Term, width: number) {
  if (term.form) {
    return numberMatches(row[FORM_NUMBERS[term.form]], term.text, width);
  }
  const words = [row.asset, row.remarks, row.driver ?? ""];
  return (
    words.some((value) => value.toLowerCase().includes(term.text)) ||
    Object.values(FORM_NUMBERS).some((key) =>
      numberMatches(row[key], term.text, width),
    )
  );
}

/**
 * The rows that match every word of `search`. `width` is how many digits
 * the list shows in a running number, so the search sees the same `10-093`
 * or `10-0093` that the list shows.
 */
export function searchWithdrawals(
  rows: SampleWithdrawal[],
  search: string,
  width: number,
) {
  const searchTerms = terms(search);
  if (searchTerms.length === 0) return rows;
  return rows.filter((row) =>
    searchTerms.every((term) => matches(row, term, width)),
  );
}
