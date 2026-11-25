import { PAPER_SIZES, paperSizeLabel, type PaperSize } from "$lib/paper-sizes";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from "@internationalized/date";
import { reamCount } from "../paper-month";
import { MAX_REAMS, type PaperPoRow } from "./paper-po-types";

type Reams = Record<PaperSize, number | null>;

/**
 * One office's row in the distribution step (its share), or in the stock
 * room step (what GSU keeps of that share in its stock room).
 */
export type DistributionRow = { id: number; orgUnitFk: string; reams: Reams };

/** The fields on the first step, which a server refusal can point at. */
export const DETAIL_FIELDS = [
  "poNumber",
  "poDate",
  "supplierFk",
  "items",
  "remarks",
];

const blank = () =>
  Object.fromEntries(PAPER_SIZES.map((s) => [s.value, null])) as Reams;

const blankNumbers = () =>
  Object.fromEntries(PAPER_SIZES.map((s) => [s.value, ""])) as Record<
    PaperSize,
    string
  >;

const count = (value: number | null) =>
  value !== null && Number.isInteger(value) && value > 0 ? value : 0;

/**
 * Everything typed into the paper PO dialog, which all three steps read: the
 * details step fills in the PO's reams of each size, the distribution step
 * splits them among the offices, and the stock room step says what GSU keeps
 * of each office's share, and sends the whole PO.
 */
export class PaperPoForm {
  editingPk = $state<number | null>(null);
  poNumber = $state("");
  poDate = $state<DateValue | undefined>(undefined);
  supplierFk = $state("");
  remarks = $state("");
  /**
   * Only on a new PO: the day each office got the part of its share that
   * GSU does not keep in the stock room. Later hand-overs of what it keeps
   * are recorded from the PO card.
   */
  handOverOn = $state<DateValue | undefined>(undefined);
  reams = $state<Reams>(blank());
  rows = $state<DistributionRow[]>([]);
  /**
   * Only on a new PO: the reams of its own share each office leaves with GSU
   * to keep in the stock room, by office. They stay that office's paper:
   * GSU only keeps them, and never gives them to another office.
   */
  leftWithGsu = $state<Record<string, Reams>>({});
  /** The PO's "Stock/Property No." of each size, for paper in the stock room. */
  stockNumbers = $state<Record<PaperSize, string>>(
    Object.fromEntries(PAPER_SIZES.map((s) => [s.value, ""])) as Record<
      PaperSize,
      string
    >,
  );
  /** On an edited PO, what each size was already handed over in total. */
  #handed: Partial<Record<PaperSize, number>> = {};
  errors = $state<Record<string, string>>({});

  #nextId = 1;

  /** With only one supplier, it is chosen already. */
  reset(supplierPks: number[] = []) {
    this.editingPk = null;
    this.poNumber = "";
    this.poDate = today(getLocalTimeZone());
    this.supplierFk = supplierPks.length === 1 ? String(supplierPks[0]) : "";
    this.remarks = "";
    this.handOverOn = undefined;
    this.reams = blank();
    this.rows = [];
    this.leftWithGsu = {};
    this.stockNumbers = blankNumbers();
    this.#handed = {};
    this.errors = {};
  }

  load(po: PaperPoRow) {
    this.editingPk = po.paperPurchaseOrderPk;
    this.poNumber = po.poNumber;
    this.poDate = parseDate(po.poDate);
    this.supplierFk = po.supplierFk ? String(po.supplierFk) : "";
    this.remarks = po.remarks ?? "";
    this.reams = blank();
    for (const item of po.items) this.reams[item.paperSize] = item.reams;
    this.rows = po.distributions.map((d) => ({
      id: this.#nextId++,
      orgUnitFk: String(d.orgUnitPk),
      reams: { ...blank(), ...d.reams },
    }));
    this.leftWithGsu = {};
    this.stockNumbers = blankNumbers();
    for (const item of po.items) {
      this.stockNumbers[item.paperSize] = item.stockNumber ?? "";
    }
    this.#handed = {};
    for (const d of po.distributions) {
      for (const [size, n] of Object.entries(d.handed)) {
        const s = size as PaperSize;
        this.#handed[s] = (this.#handed[s] ?? 0) + (n ?? 0);
      }
    }
    this.errors = {};
  }

  clearError(key: string) {
    if (this.errors[key]) delete this.errors[key];
  }

  /** The sizes with reams on the PO, in the order of PAPER_SIZES. */
  sizesOnPo = $derived(
    PAPER_SIZES.filter((s) => count(this.reams[s.value]) > 0).map(
      (s) => s.value,
    ),
  );

  totalReams = $derived(
    this.sizesOnPo.reduce((sum, size) => sum + count(this.reams[size]), 0),
  );

  given(size: PaperSize) {
    return this.rows.reduce((sum, row) => sum + count(row.reams[size]), 0);
  }

  /** Reams of a size no office has been given yet. Negative when over the PO. */
  left(size: PaperSize) {
    return count(this.reams[size]) - this.given(size);
  }

  detailErrors() {
    const found: Record<string, string> = {};
    if (!this.poNumber.trim()) found.poNumber = "Enter the PO number.";
    if (!this.poDate) {
      found.poDate = "Enter the date on the PO.";
    } else if (this.poDate.compare(today(getLocalTimeZone())) > 0) {
      found.poDate = "Enter a date on or before today.";
    }
    if (!this.supplierFk) found.supplierFk = "Choose the supplier.";
    if (PAPER_SIZES.some((s) => (this.reams[s.value] ?? 0) > MAX_REAMS)) {
      found.items = `Enter at most ${MAX_REAMS.toLocaleString("en-PH")} reams of each size.`;
    } else if (this.sizesOnPo.length === 0) {
      found.items = "Enter the reams of at least one size.";
    }
    return found;
  }

  /** On reaching the stock room step: the PO date until GSU changes it. */
  seedHandOverOn() {
    this.handOverOn ??= this.poDate;
  }

  /** An office's share of a size, from the distribution step. */
  shareOf(orgUnitFk: string, size: PaperSize) {
    return count(
      this.rows.find((r) => r.orgUnitFk === orgUnitFk)?.reams[size] ?? null,
    );
  }

  /**
   * On reaching the stock room step: a line for each office in the
   * distribution, and none for an office taken off it since.
   */
  syncLeft() {
    const offices = new Set(this.rows.map((r) => r.orgUnitFk));
    for (const office of offices) this.leftWithGsu[office] ??= blank();
    for (const office of Object.keys(this.leftWithGsu)) {
      if (!offices.has(office)) delete this.leftWithGsu[office];
    }
  }

  /** Reams of a size left with GSU, all offices together. */
  stocked(size: PaperSize) {
    return Object.values(this.leftWithGsu).reduce(
      (sum, reams) => sum + count(reams[size]),
      0,
    );
  }

  /**
   * Whether a size needs its stock number: some of it sits in the stock
   * room. On an edited PO, that is its share not handed over yet.
   */
  needsStockNumber(size: PaperSize) {
    return this.editingPk === null
      ? this.stocked(size) > 0
      : this.given(size) - (this.#handed[size] ?? 0) > 0;
  }

  stockErrors() {
    const found: Record<string, string> = {};
    const todayDate = today(getLocalTimeZone());
    if (this.editingPk === null) {
      if (!this.handOverOn) {
        found.handOverOn = "Enter the date GSU handed over the paper.";
      } else if (
        (this.poDate && this.handOverOn.compare(this.poDate) < 0) ||
        this.handOverOn.compare(todayDate) > 0
      ) {
        found.handOverOn = "Enter a date from the PO date to today.";
      }
      const over = Object.entries(this.leftWithGsu).flatMap(([office, reams]) =>
        this.sizesOnPo
          .filter((s) => count(reams[s]) > this.shareOf(office, s))
          .map((s) => ({ office, size: s })),
      )[0];
      if (over) {
        found.stock = `An office can leave at most its own share with GSU: ${reamCount(this.shareOf(over.office, over.size))} of ${paperSizeLabel(over.size)}.`;
      }
    }
    const missing = this.sizesOnPo.find(
      (s) => this.needsStockNumber(s) && !this.stockNumbers[s].trim(),
    );
    if (missing) {
      found.stockNumbers = `Enter the stock no. of ${paperSizeLabel(missing)}.`;
    }
    return found;
  }

  addRow() {
    const row = { id: this.#nextId++, orgUnitFk: "", reams: blank() };
    this.rows.push(row);
    this.clearError("distribution");
    return row.id;
  }

  removeRow(id: number) {
    this.rows = this.rows.filter((r) => r.id !== id);
    this.clearError("distribution");
  }

  /** Offices another row already has; offered disabled. */
  takenElsewhere(id: number) {
    return new Set(
      this.rows.filter((r) => r.id !== id).map((r) => r.orgUnitFk),
    );
  }

  distributionErrors() {
    const found: Record<string, string> = {};
    const over = this.sizesOnPo.find((size) => this.left(size) < 0);
    const under = this.sizesOnPo.find((size) => this.left(size) > 0);
    if (this.rows.some((r) => !r.orgUnitFk)) {
      found.distribution = "Choose an office for each row.";
    } else if (
      this.rows.some((r) => this.sizesOnPo.every((s) => !count(r.reams[s])))
    ) {
      found.distribution =
        "Enter the reams for each office, or remove its row.";
    } else if (over) {
      found.distribution = `Take ${reamCount(-this.left(over))} of ${paperSizeLabel(over)} off the offices.`;
    } else if (under) {
      found.distribution = `Allocate the other ${reamCount(this.left(under))} of ${paperSizeLabel(under)}.`;
    }
    return found;
  }

  /** Everything the server needs, sent as one JSON field. */
  payload = $derived(
    JSON.stringify({
      paperPurchaseOrderPk: this.editingPk ?? undefined,
      poNumber: this.poNumber.trim(),
      poDate: this.poDate?.toString() ?? "",
      supplierFk: Number(this.supplierFk),
      remarks: this.remarks.trim(),
      handOverOn:
        this.editingPk === null ? (this.handOverOn?.toString() ?? "") : "",
      items: this.sizesOnPo.map((size) => ({
        paperSize: size,
        reams: count(this.reams[size]),
        stockNumber: this.stockNumbers[size].trim(),
      })),
      stock:
        this.editingPk === null
          ? Object.entries(this.leftWithGsu).map(([office, reams]) => ({
              orgUnitFk: Number(office),
              reams: Object.fromEntries(
                this.sizesOnPo.map((size) => [size, count(reams[size])]),
              ),
            }))
          : [],
      // A size taken off the PO since its reams were given drops out here.
      distributions: this.rows.map((row) => ({
        orgUnitFk: Number(row.orgUnitFk),
        reams: Object.fromEntries(
          this.sizesOnPo.map((size) => [size, count(row.reams[size])]),
        ),
      })),
    }),
  );
}
