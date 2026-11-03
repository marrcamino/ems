import { amountInCentavos, type Fuel } from "./purchase-orders/po-math";
import type { WithdrawalStatus } from "./withdrawal-status";

/**
 * Made-up withdrawals and trips for the Fuel page, so GSU and the GHG Focal
 * Person can try the list before withdrawals are recorded (MPP-80).
 *
 * There are 105: 4 in December 2025, so the numbers can be seen starting over
 * in January, and the rest from January to 13 November 2026.
 * `sampleWithdrawals` shows only those filed up to today.
 *
 * Liters are in hundredths and amounts in centavos, as in po-math.ts.
 */

/**
 * Which kind of transaction a row is (point 1 of "Recording a fuel
 * issuance"): a withdrawal, a trip only with no fuel taken, or a reimbursed
 * trip, where the driver bought the fuel during the trip.
 */
export type TransactionKind = "withdrawal" | "trip" | "reimbursed";

export type SampleWithdrawal = {
  id: number;
  fileDate: string;
  office: string;
  kind: TransactionKind;
  /**
   * The transaction's own number, one count across every office, starting
   * over every January (point 1 of "Recording a fuel issuance").
   */
  controlNumber: string;
  /**
   * The office's own count for the year, trips included, shown as a small
   * badge. Real data works it out when the list is shown and never saves it
   * (point 8).
   */
  officeCount: number;
  /** Only a withdrawal has a withdrawal slip. */
  wsNumber: string | null;
  /** A withdrawal and a reimbursed trip have an RIS; a trip only has none. */
  risNumber: string | null;
  status: WithdrawalStatus;
  /** The litres the driver wrote on the slip; null on a trip. */
  requestedH: number | null;
  /**
   * The litres the supplier pumped; null until the slip is back, on a
   * cancelled slip, and on a trip.
   */
  withdrawnH: number | null;
  /** The litres on the DTT's "purchased during trip" line. */
  boughtH: number | null;
  /**
   * The pump price of a slip that is back. For any other slip, the last
   * pump price known for its fuel, used only to estimate the balance. Null
   * on a trip.
   */
  priceC: number | null;
  /** Null until the slip is back, on a cancelled slip, and on a trip. */
  amountC: number | null;
  /**
   * What is left of the office's allocation of this fuel after this slip.
   * A slip not back yet takes off the litres requested; a cancelled slip
   * takes off nothing. Null on a trip, because only a withdrawal counts down
   * an allocation.
   */
  balanceH: number | null;
  /** The PO a withdrawal is charged to; a trip has none (point 10.1). */
  poNumber: string | null;
  fuel: Fuel;
  asset: string;
  /** Only a vehicle with a driver has a trip ticket. */
  tripTicketNumber: string | null;
  driver: string | null;
  remarks: string;
};

/** Every office, in the order of the office's structure, OPENRO first. */
export const SAMPLE_OFFICES = [
  "OPENRO",
  "TSD",
  "MES",
  "CDS",
  "PS",
  "AFS",
  "ICTU",
  "GSU",
];

/** The fuel comes from the asset, never from the slip. */
const ASSET_FUEL: Record<string, Fuel> = {
  "Toyota Hilux": "diesel",
  "Mitsubishi L300": "diesel",
  "Motorcycle XRM 125": "gasoline",
  "Motorcycle TMX 155": "gasoline",
  "Generator 10 kVA": "diesel",
  "Generator 5 kVA": "gasoline",
  "Grass cutter": "gasoline",
  Chainsaw: "gasoline",
  "PA Patrol Boat": "gasoline",
};

/** The vehicles, the only assets with a trip ticket, and their driver. */
const DRIVERS: Record<string, string> = {
  "Toyota Hilux": "J. Dela Cruz",
  "Mitsubishi L300": "A. Navarro",
  "Motorcycle XRM 125": "R. Santos",
  "Motorcycle TMX 155": "P. Ramos",
};

/** Each office's allocation of each fuel on every PO, in liters. */
const ALLOCATIONS: Record<string, Record<Fuel, number>> = {
  OPENRO: { gasoline: 30, diesel: 120 },
  TSD: { gasoline: 30, diesel: 150 },
  MES: { gasoline: 80, diesel: 80 },
  CDS: { gasoline: 60, diesel: 100 },
  PS: { gasoline: 25, diesel: 0 },
  AFS: { gasoline: 25, diesel: 0 },
  ICTU: { gasoline: 30, diesel: 0 },
  GSU: { gasoline: 20, diesel: 150 },
};

/**
 * The made-up POs and the days they opened. Each one gives every office its
 * allocation again, so the balances go back up on these days.
 */
const SAMPLE_POS = [
  { number: "PO-2025-10-004", opened: "2025-10-01" },
  { number: "PO-2026-01-001", opened: "2026-01-05" },
  { number: "PO-2026-04-002", opened: "2026-04-06" },
  { number: "PO-2026-07-003", opened: "2026-07-06" },
  { number: "PO-2026-10-004", opened: "2026-10-05" },
];

/** Only the newest made-up PO is still open; the supplier was paid for the rest. */
export const SAMPLE_OPEN_PO_NUMBERS = [SAMPLE_POS.at(-1)!.number];

/**
 * The pump price in whole pesos, by month. Most pump prices here are whole
 * pesos; about 1 slip in 7 gets a price with centavos (see `build`).
 */
const PRICES: Record<Fuel, Record<string, number>> = {
  diesel: {
    "2025-12": 60,
    "2026-01": 61,
    "2026-02": 62,
    "2026-03": 62,
    "2026-04": 63,
    "2026-05": 64,
    "2026-06": 63,
    "2026-07": 62,
    "2026-08": 63,
    "2026-09": 64,
    "2026-10": 63,
    "2026-11": 64,
  },
  gasoline: {
    "2025-12": 65,
    "2026-01": 66,
    "2026-02": 67,
    "2026-03": 67,
    "2026-04": 68,
    "2026-05": 69,
    "2026-06": 68,
    "2026-07": 67,
    "2026-08": 68,
    "2026-09": 69,
    "2026-10": 68,
    "2026-11": 69,
  },
};

/** The whole-peso pump price on the slip's date, in centavos per liter. */
function pumpPrice(fuel: Fuel, fileDate: string) {
  return PRICES[fuel][fileDate.slice(0, 7)] * 100;
}

/** What an office usually takes fuel for, with the usual liters and remarks. */
type Use = {
  office: string;
  asset: string;
  liters: number[];
  remarks: string[];
};

const USES: Use[] = [
  {
    office: "OPENRO",
    asset: "Toyota Hilux",
    liters: [20, 22, 25],
    remarks: ["Meeting, Dinagat", "Meeting, San Jose", "Meeting, Libjo", ""],
  },
  {
    office: "OPENRO",
    asset: "Motorcycle XRM 125",
    liters: [5, 6],
    remarks: [""],
  },
  {
    office: "TSD",
    asset: "Mitsubishi L300",
    liters: [25, 28, 30],
    remarks: ["Field monitoring, Loreto", "Field monitoring, Tubajon", ""],
  },
  {
    office: "TSD",
    asset: "Motorcycle TMX 155",
    liters: [5, 6],
    remarks: ["Inspection, Cagdianao", "Inspection, Libjo", ""],
  },
  {
    office: "MES",
    asset: "PA Patrol Boat",
    liters: [15, 16, 18],
    remarks: ["Coastal patrol"],
  },
  {
    office: "MES",
    asset: "Chainsaw",
    liters: [2, 3],
    remarks: ["Clearing at the nursery"],
  },
  {
    office: "MES",
    asset: "Mitsubishi L300",
    liters: [22, 24],
    remarks: ["Survey, Cagdianao", "Field monitoring, Loreto"],
  },
  {
    office: "CDS",
    asset: "Toyota Hilux",
    liters: [25, 26],
    remarks: ["Seedling delivery, San Jose", ""],
  },
  {
    office: "CDS",
    asset: "Motorcycle XRM 125",
    liters: [5, 5.5, 6],
    remarks: [""],
  },
  {
    office: "CDS",
    asset: "Grass cutter",
    liters: [4],
    remarks: ["Grounds upkeep"],
  },
  { office: "PS", asset: "Motorcycle XRM 125", liters: [5, 6], remarks: [""] },
  { office: "PS", asset: "Motorcycle TMX 155", liters: [5], remarks: [""] },
  {
    office: "AFS",
    asset: "Motorcycle XRM 125",
    liters: [5, 5.5],
    remarks: ["Bank deposit, San Jose", ""],
  },
  {
    office: "ICTU",
    asset: "Generator 5 kVA",
    liters: [4, 5],
    remarks: ["Brownout, server room"],
  },
  {
    office: "ICTU",
    asset: "Motorcycle TMX 155",
    liters: [5, 6],
    remarks: ["Network repair, Basilisa"],
  },
  {
    office: "GSU",
    asset: "Generator 10 kVA",
    liters: [12, 15, 18, 20],
    remarks: ["Brownout"],
  },
  { office: "GSU", asset: "Grass cutter", liters: [4], remarks: [""] },
  {
    office: "GSU",
    asset: "Mitsubishi L300",
    liters: [28, 30],
    remarks: [""],
  },
];

const VEHICLE_USES = USES.filter((use) => use.asset in DRIVERS);
/** The longer trips, where a driver may have to buy fuel on the way. */
const CAR_USES = VEHICLE_USES.filter(
  (use) => !use.asset.startsWith("Motorcycle"),
);

type Draft = {
  fileDate: string;
  office: string;
  kind: TransactionKind;
  /** The liters requested, or bought on a reimbursed trip; 0 on a trip. */
  liters: number;
  asset: string;
  remarks: string;
  status: WithdrawalStatus;
};

/** The 4 slips of December 2025, on the PO that opened in October. */
const DECEMBER_2025: Draft[] = [
  ["2025-12-03", "GSU", 15, "Generator 10 kVA", "Brownout"],
  ["2025-12-09", "CDS", 6, "Motorcycle XRM 125", ""],
  ["2025-12-15", "OPENRO", 20, "Toyota Hilux", "Meeting, San Jose"],
  ["2025-12-22", "TSD", 25, "Mitsubishi L300", "Field monitoring, Loreto"],
].map(([fileDate, office, liters, asset, remarks]) => ({
  fileDate: fileDate as string,
  office: office as string,
  kind: "withdrawal",
  liters: liters as number,
  asset: asset as string,
  remarks: remarks as string,
  status: "complete",
}));

// Where the other kinds and statuses fall among the 101 rows of 2026,
// counted from 0. Out and Waiting for approval are set by
// `sampleWithdrawals`, on the newest rows.
const TRIPS_ONLY = [8, 23, 41, 57, 74, 92];
/** The liters bought on each reimbursed trip, as written on the DTT. */
const REIMBURSED: Record<number, number> = { 33: 15.38, 62: 12.6, 80: 20 };
const CANCELLED = [15, 48, 70];
const INCOMPLETE = [66, 78, 86];

/**
 * A fixed run of random numbers (mulberry32), so the made-up rows are the
 * same on every load and on both the server and the browser.
 */
function randomFrom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monday to Friday from `from` to `to`, as ISO dates. */
function workingDays(from: string, to: string) {
  const days: string[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (
    const day = new Date(`${from}T00:00:00Z`);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(day.toISOString().slice(0, 10));
    }
  }
  return days;
}

/** The 101 rows of 2026, spread over the working days. */
function drafts2026(): Draft[] {
  const random = randomFrom(2026);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  // 15 November 2026 is a Sunday, so the last working day is the 13th.
  const days = workingDays("2026-01-05", "2026-11-13");
  const count = 101;

  return Array.from({ length: count }, (_, i): Draft => {
    // Row i falls somewhere in its own share of the days, so the rows stay
    // in date order, with some days holding two and many holding none.
    const fileDate =
      i === count - 1
        ? days[days.length - 1]
        : days[Math.floor(((i + random()) * days.length) / count)];

    let kind: TransactionKind = "withdrawal";
    if (TRIPS_ONLY.includes(i)) kind = "trip";
    if (i in REIMBURSED) kind = "reimbursed";

    let status: WithdrawalStatus = "complete";
    if (CANCELLED.includes(i)) status = "cancelled";
    // Only a withdrawal with a DTT can be Incomplete.
    if (INCOMPLETE.includes(i)) status = "incomplete";

    let uses = USES;
    if (kind === "trip" || status === "incomplete") uses = VEHICLE_USES;
    if (kind === "reimbursed") uses = CAR_USES;
    const use = pick(uses);
    let liters = pick(use.liters);
    if (kind === "trip") liters = 0;
    if (kind === "reimbursed") liters = REIMBURSED[i];

    return {
      fileDate,
      office: use.office,
      kind,
      liters,
      asset: use.asset,
      remarks: pick(use.remarks),
      status,
    };
  });
}

function padded(n: number) {
  return String(n).padStart(3, "0");
}

/**
 * Where each count stood on 1 December 2025, before the first row here, so
 * December's numbers carry on from there. Every count starts over in
 * January.
 */
const COUNTS_ON_1_DECEMBER_2025 = {
  control: 108,
  ws: 96,
  ris: 380,
  tripTicket: 70,
  office: {
    OPENRO: 15,
    TSD: 18,
    MES: 14,
    CDS: 20,
    PS: 6,
    AFS: 7,
    ICTU: 8,
    GSU: 20,
  } as Record<string, number>,
};

/**
 * Every made-up row in date order, numbered, with its running balance: each
 * slip counts down its own office's allocation of its fuel on the open PO,
 * like GSU's logbook does per fuel.
 */
function build(): SampleWithdrawal[] {
  const random = randomFrom(7);
  const start = COUNTS_ON_1_DECEMBER_2025;
  let year = "2025";
  let control = start.control;
  let ws = start.ws;
  let ris = start.ris;
  let tripTicket = start.tripTicket;
  let officeCounts = { ...start.office };

  let poIndex = -1;
  let left: Record<string, Record<Fuel, number>> = {};
  // Counts the slips with a price, to give every 7th one centavos.
  let priced = 0;

  return [...DECEMBER_2025, ...drafts2026()].map((draft, i) => {
    if (draft.fileDate.slice(0, 4) !== year) {
      year = draft.fileDate.slice(0, 4);
      control = ws = ris = tripTicket = 0;
      officeCounts = {};
    }
    // A new PO gives every office its allocation again.
    while (draft.fileDate >= (SAMPLE_POS[poIndex + 1]?.opened ?? "9999")) {
      poIndex++;
      left = Object.fromEntries(
        Object.entries(ALLOCATIONS).map(([office, a]) => [
          office,
          { gasoline: a.gasoline * 100, diesel: a.diesel * 100 },
        ]),
      );
    }

    const month = draft.fileDate.slice(5, 7);
    const number = (n: number) => `${year}-${month}-${padded(n)}`;
    const fuel = ASSET_FUEL[draft.asset];
    const litersH = Math.round(draft.liters * 100);
    const isWithdrawal = draft.kind === "withdrawal";
    const isBack =
      isWithdrawal &&
      (draft.status === "complete" || draft.status === "incomplete");
    const driver = DRIVERS[draft.asset] ?? null;

    control++;
    officeCounts[draft.office] = (officeCounts[draft.office] ?? 0) + 1;
    if (isWithdrawal) ws++;
    // The RIS numbers skip the ones that went to supplies that are not fuel.
    if (draft.kind !== "trip") ris += 1 + Math.floor(random() * 5);
    if (driver) tripTicket++;

    let priceC: number | null = isWithdrawal
      ? pumpPrice(fuel, draft.fileDate)
      : null;
    if (isBack && priceC !== null) {
      priced++;
      if (priced % 7 === 3) priceC += priced % 2 ? 50 : 75;
    }

    let balanceH: number | null = null;
    if (isWithdrawal) {
      if (draft.status !== "cancelled") left[draft.office][fuel] -= litersH;
      balanceH = left[draft.office][fuel];
    }

    return {
      id: i + 1,
      fileDate: draft.fileDate,
      office: draft.office,
      kind: draft.kind,
      controlNumber: number(control),
      officeCount: officeCounts[draft.office],
      wsNumber: isWithdrawal ? `${month}-${padded(ws)}` : null,
      risNumber: draft.kind === "trip" ? null : number(ris),
      status: draft.status,
      requestedH: isWithdrawal ? litersH : null,
      withdrawnH: isBack ? litersH : null,
      boughtH: draft.kind === "reimbursed" ? litersH : null,
      priceC,
      amountC:
        isBack && priceC !== null ? amountInCentavos(litersH, priceC) : null,
      balanceH,
      poNumber: isWithdrawal ? SAMPLE_POS[poIndex].number : null,
      fuel,
      asset: draft.asset,
      tripTicketNumber: driver ? number(tripTicket) : null,
      driver,
      remarks: draft.remarks,
    };
  });
}

const ALL = build();

/** `today` as `2026-10-27`, in the computer's own time zone. */
function isoDate(today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

/**
 * The made-up rows filed up to `today`, as if the list were opened that day.
 * The newest rows are not finished yet: the two newest withdrawals wait for
 * approval, and the two rows before them are out. A trip has no slip to
 * sign, so it starts as Out, never as Waiting for approval (point 9.5).
 */
export function sampleWithdrawals(today = new Date()): SampleWithdrawal[] {
  const cutoff = isoDate(today);
  const rows = ALL.filter((row) => row.fileDate <= cutoff).map((row) => ({
    ...row,
  }));

  let waiting = 0;
  let out = 0;
  for (let i = rows.length - 1; i >= 0 && (waiting < 2 || out < 2); i--) {
    const row = rows[i];
    // A cancelled or incomplete row keeps its status.
    if (row.status !== "complete") continue;

    if (row.kind === "withdrawal" && waiting < 2) {
      row.status = "waiting";
      waiting++;
    } else if (out < 2) {
      row.status = "out";
      out++;
    } else {
      continue;
    }

    // Nothing is pumped until the slip is back, so the balance stays an
    // estimate at the last pump price known, without centavos.
    if (row.kind === "withdrawal") {
      row.withdrawnH = null;
      row.amountC = null;
      row.priceC = pumpPrice(row.fuel, row.fileDate);
    }
  }
  return rows;
}
