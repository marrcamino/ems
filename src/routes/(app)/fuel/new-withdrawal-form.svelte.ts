import type { SessionUser } from "$lib/types";
import { fullName } from "$lib/utils";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from "@internationalized/date";
import type { PageData } from "./$types";
import type { TransactionDetails } from "./issuance.server";
import type { PickerItem } from "./search-picker.svelte";
import {
  oldestPoFirstMessage,
  overBalanceMessage,
  type PoBalance,
} from "./withdrawal-row";

/** What the New withdrawal form needs from the page. */
export type WithdrawalData = Pick<
  PageData,
  | "assets"
  | "employees"
  | "offices"
  | "gsuOfficePk"
  | "usualApproverPk"
  | "poBalances"
  | "allOffices"
>;

export type Step = "slip" | "ris" | "dtt";

/**
 * Which transaction the form records, and so which printed forms it has
 * ("Which forms apply" in fuel-purchase-orders.md): a withdrawal has a slip,
 * an RIS, and a trip ticket when its asset has one; a trip only has a trip
 * ticket; a reimbursed trip has an RIS and a trip ticket.
 */
export type Kind = "withdrawal" | "trip" | "reimbursed";

/** On whichever step comes first. */
export const TRANSACTION_FIELDS = ["officePk", "fileDate", "assetPk"];

/** Which step each field the server can refuse is on. */
export const STEP_FIELDS: Record<Step, string[]> = {
  slip: [
    "purchaseOrderPk",
    "requested",
    "wsWithdrawnBy",
    "wsRequestedBy",
    "wsApprovedBy",
  ],
  ris: [
    "risFundCluster",
    "risResponsibilityCenterCode",
    "risStockNumber",
    "risRemarks",
    "risPurpose",
    "risRequestedBy",
    "risApprovedBy",
    "risIssuedBy",
  ],
  dtt: [
    "driverPk",
    "destination",
    "dttPurpose",
    "travelFrom",
    "travelTo",
    "travelHours",
    "departureTime",
    "tankBalanceBefore",
    "purchasedLiters",
    "oilLubricant",
    "odometerStart",
    "dttRemarks",
    "dttApprovedBy",
  ],
};

/** A legend with a line after it, between the parts of a step. */
export const LEGEND =
  "text-muted-foreground gap-2 min-h-4 text-left relative flex w-full items-center after:h-px after:min-w-0 after:flex-1 after:bg-border after:ml-1";

/**
 * Everything the New withdrawal form holds, shared by its three steps. The
 * Trip only and Reimbursed trip forms use it too, with their own `kind`:
 * every field, the server's refusals, and what is worked out from them,
 * such as the PO and its balance. Passed to each step as `form`.
 *
 * ```svelte
 * const form = new WithdrawalForm(() => data, () => gblCtx.user);
 * <RisStep {form} />
 * ```
 */
export class WithdrawalForm {
  #data: () => WithdrawalData;
  #user: () => SessionUser;
  readonly kind: Kind;

  constructor(
    data: () => WithdrawalData,
    user: () => SessionUser,
    kind: Kind = "withdrawal",
  ) {
    this.#data = data;
    this.#user = user;
    this.kind = kind;
  }

  get data() {
    return this.#data();
  }

  // ── The withdrawal slip ──
  fileDate = $state<DateValue | undefined>();
  officePk = $state("");
  assetPk = $state("");
  requestBy = $state<"liters" | "pesos">("liters");
  litres = $state<number | null>(null);
  pesos = $state<number | null>(null);
  // Picked, or typed for someone outside the office (point 6 of "Three
  // forms, and they are not peers"). The same for the driver.
  wsWithdrawnBy = $state("");
  wsWithdrawnByName = $state("");
  wsRequestedBy = $state("");
  wsApprovedBy = $state("");

  // ── The RIS ──
  risFundCluster = $state("");
  risResponsibilityCenterCode = $state("");
  risStockNumber = $state("");
  risRemarks = $state("");
  risPurpose = $state("");
  risRequestedBy = $state("");
  risApprovedBy = $state("");
  risIssuedBy = $state("");
  risReceivedBy = $state("");

  // ── The trip ticket ──
  driverPk = $state("");
  driverName = $state("");
  passengers = $state<string[]>([]);
  /** The passengers dialog, open on top of this one. */
  passengersOpen = $state(false);
  destination = $state("");
  dttPurpose = $state("");
  travelFrom = $state<DateValue | undefined>();
  travelTo = $state<DateValue | undefined>();
  travelHours = $state<number | null>(null);
  dttRemarks = $state("");
  departureTime = $state("");
  tankBalanceBefore = $state<number | null>(null);
  /** "Purchased during trip", asked only on a reimbursed trip. */
  purchasedLiters = $state<number | null>(null);
  oilLubricant = $state("");
  odometerStart = $state<number | null>(null);
  dttApprovedBy = $state("");

  /** The server's refusals, by field, shown under the field. */
  errors = $state<Record<string, string>>({});

  /** The saved transaction being edited; null on a new one. */
  editing = $state<{ id: number; controlNumber: string } | null>(null);
  /**
   * While editing, the balances without the transaction's own request, so
   * the request is checked against what it may really take.
   */
  #editBalances = $state<PoBalance[] | null>(null);

  // ── What the pickers offer ──

  everyone = $derived(this.data.employees.map(asItem));
  gsuStaff = $derived(
    this.data.employees
      .filter((e) => e.orgUnitFk === this.data.gsuOfficePk)
      .map(asItem),
  );
  noGsuStaff = $derived(
    this.data.gsuOfficePk === null
      ? "No General Services Unit is set. An admin sets it on the Signatories page."
      : "Nobody works in the General Services Unit.",
  );
  officeItems = $derived(
    this.data.offices.map((o): PickerItem => ({
      value: String(o.orgUnitPk),
      label: o.abbr,
      detail: o.orgUnitName,
      buttonLabel: o.orgUnitName,
      suffix: `(${o.abbr})`,
    })),
  );
  // The button reads name, type, then plate; the list drops the type into a
  // badge. Names repeat (Topic 2 of fuel-assets.md), so two assets with the
  // same name and no plate add their property number, or they would read
  // the same. It is always searchable.
  assetItems = $derived.by(() => {
    const assets = this.data.assets;
    const nameKey = (name: string) => name.trim().toLowerCase();
    const unplated = new Map<string, number>();
    for (const a of assets) {
      if (a.plateNumber) continue;
      const key = nameKey(a.assetName);
      unplated.set(key, (unplated.get(key) ?? 0) + 1);
    }
    return assets.map((a): PickerItem => {
      const sameName = (unplated.get(nameKey(a.assetName)) ?? 0) > 1;
      const tag = a.plateNumber ?? (sameName ? `PN ${a.propertyNumber}` : null);
      return {
        value: String(a.assetPk),
        label: [a.assetName, tag].filter(Boolean).join(" · "),
        buttonLabel: [a.assetName, a.assetTypeName, tag]
          .filter(Boolean)
          .join(" · "),
        badge: a.assetTypeName,
        keywords: [a.propertyNumber],
      };
    });
  });

  /**
   * A trip, with or without a reimbursement, is made only for an asset whose
   * Trip ticket switch is on.
   */
  tripAssetItems = $derived.by(() => {
    const withTicket = new Set(
      this.data.assets
        .filter((a) => a.hasTripTicket)
        .map((a) => String(a.assetPk)),
    );
    return this.assetItems.filter((item) => withTicket.has(item.value));
  });

  // ── The asset, the PO, and the request ──

  asset = $derived(
    this.data.assets.find((a) => String(a.assetPk) === this.assetPk),
  );
  // The asset decides whether there is a trip ticket ("Trip ticket belongs to
  // the asset" in fuel-assets.md).
  hasTripTicket = $derived(this.asset?.hasTripTicket ?? false);

  office = $derived(
    this.data.offices.find((o) => String(o.orgUnitPk) === this.officePk),
  );
  // Every PO where the office still has this fuel, oldest first. The oldest
  // is filled in again whenever the office or the asset changes. A newer one
  // can be picked, but it is refused: the oldest is used up first (point 4
  // of "How POs and withdrawal slips work").
  poOptions = $derived.by(() => {
    const { office, asset } = this;
    if (!office || !asset) return [];
    return (this.#editBalances ?? this.data.poBalances).filter(
      (b) => b.orgUnitPk === office.orgUnitPk && b.fuel === asset.fuelType,
    );
  });
  purchaseOrderPk = $derived(
    this.poOptions.length > 0 ? String(this.poOptions[0].purchaseOrderPk) : "",
  );
  poBalance = $derived(
    this.poOptions.find(
      (b) => String(b.purchaseOrderPk) === this.purchaseOrderPk,
    ) ?? null,
  );
  poError = $derived(
    this.office && this.poBalance && this.poBalance !== this.poOptions[0]
      ? oldestPoFirstMessage(this.poOptions[0], this.office.abbr)
      : "",
  );
  // Picked, but nothing left of that fuel on any PO, so the server refuses.
  noBalance = $derived(
    !!this.office && !!this.asset && this.poOptions.length === 0,
  );
  isPriceBased = $derived(this.poBalance?.poType === "price");
  // Only a price-based PO can be asked by pesos: its litres are not known
  // until the supplier pumps.
  byPesos = $derived(this.isPriceBased && this.requestBy === "pesos");
  // The server refuses the same request with the same words.
  requestError = $derived(
    this.poBalance
      ? (overBalanceMessage(this.poBalance, {
          requestedH: this.byPesos
            ? null
            : Math.round((this.litres ?? 0) * 100),
          requestedC: this.byPesos ? Math.round((this.pesos ?? 0) * 100) : null,
        }) ?? "")
      : "",
  );
  /** The slip cannot be left while its PO or its request is refused. */
  slipBlocked = $derived(
    !!this.poError || !!this.requestError || this.noBalance,
  );

  // ── The two purposes ──

  /**
   * The two purposes copy each other (point 5 of "Three forms, and they are
   * not peers"). Typing one fills the other while the other is empty or still
   * a copy. One the person typed is never overwritten; emptying it makes it a
   * copy again, and leaving it empty fills it from the other.
   */
  #typedPurpose = { ris: false, dtt: false };

  typePurpose(form: "ris" | "dtt", value: string) {
    const other = form === "ris" ? "dtt" : "ris";
    this.#typedPurpose[form] = value !== "";
    if (form === "ris") this.risPurpose = value;
    else this.dttPurpose = value;
    if (this.#typedPurpose[other]) return;
    if (other === "ris") this.risPurpose = value;
    else this.dttPurpose = value;
  }

  leavePurpose(form: "ris" | "dtt") {
    if (form === "ris" && !this.risPurpose) this.risPurpose = this.dttPurpose;
    if (form === "dtt" && !this.dttPurpose) this.dttPurpose = this.risPurpose;
  }

  /** Empty again, with the usual people filled in and today's file date. */
  seed() {
    const me = this.#user().employee;
    // A GSU line with only one person to offer starts with that person.
    const onlyGsu = this.gsuStaff.length === 1 ? this.gsuStaff[0].value : "";
    const approver =
      this.data.usualApproverPk === null
        ? ""
        : String(this.data.usualApproverPk);

    this.fileDate = today(getLocalTimeZone());
    this.officePk = String(me.orgUnitFk ?? "");
    this.assetPk = "";
    this.requestBy = "liters";
    this.litres = null;
    this.pesos = null;
    this.wsWithdrawnBy = "";
    this.wsWithdrawnByName = "";
    this.wsRequestedBy = String(me.employeePk);
    this.wsApprovedBy = onlyGsu;

    this.risFundCluster = "";
    this.risResponsibilityCenterCode = "";
    this.risStockNumber = "";
    this.risRemarks = "";
    this.risPurpose = "";
    this.risRequestedBy = String(me.employeePk);
    this.risApprovedBy = approver;
    this.risIssuedBy = onlyGsu;
    this.risReceivedBy = "";

    this.driverPk = "";
    this.driverName = "";
    this.passengers = [];
    this.destination = "";
    this.dttPurpose = "";
    this.travelFrom = undefined;
    this.travelTo = undefined;
    this.travelHours = null;
    this.dttRemarks = "";
    this.departureTime = "";
    this.tankBalanceBefore = null;
    this.purchasedLiters = null;
    this.oilLubricant = "";
    this.odometerStart = null;
    this.dttApprovedBy = approver;

    this.#typedPurpose = { ris: false, dtt: false };
    this.errors = {};
    this.editing = null;
    this.#editBalances = null;
  }

  /** Filled in from a saved transaction, to edit it. */
  load(details: TransactionDetails) {
    const v = details.values;
    const date = (value: string) => (value ? parseDate(value) : undefined);
    this.editing = { id: details.id, controlNumber: details.controlNumber };
    this.#editBalances = details.poBalances;

    this.fileDate = date(v.fileDate);
    this.officePk = v.officePk;
    this.assetPk = v.assetPk;
    this.requestBy = v.requestBy === "pesos" ? "pesos" : "liters";
    this.litres = v.liters;
    this.pesos = v.pesos;
    this.wsWithdrawnBy = v.wsWithdrawnBy;
    this.wsWithdrawnByName = v.wsWithdrawnByName;
    this.wsRequestedBy = v.wsRequestedBy;
    this.wsApprovedBy = v.wsApprovedBy;

    this.risFundCluster = v.risFundCluster;
    this.risResponsibilityCenterCode = v.risResponsibilityCenterCode;
    this.risStockNumber = v.risStockNumber;
    this.risRemarks = v.risRemarks;
    this.risPurpose = v.risPurpose;
    this.risRequestedBy = v.risRequestedBy;
    this.risApprovedBy = v.risApprovedBy;
    this.risIssuedBy = v.risIssuedBy;
    this.risReceivedBy = v.risReceivedBy;

    this.driverPk = v.driverPk;
    this.driverName = v.driverName;
    this.passengers = v.passengers;
    this.destination = v.destination;
    this.dttPurpose = v.dttPurpose;
    this.travelFrom = date(v.travelFrom);
    this.travelTo = date(v.travelTo);
    this.travelHours = v.travelHours;
    this.dttRemarks = v.dttRemarks;
    this.departureTime = v.departureTime;
    this.tankBalanceBefore = v.tankBalanceBefore;
    this.purchasedLiters = v.purchasedLiters;
    this.oilLubricant = v.oilLubricant;
    this.odometerStart = v.odometerStart;
    this.dttApprovedBy = v.dttApprovedBy;

    // Both purposes were saved as they stand, so neither copies the other.
    this.#typedPurpose = { ris: true, dtt: true };
    this.errors = {};
  }

  /** What is sent, as JSON in one form field. */
  payload = $derived(
    JSON.stringify({
      id: this.editing?.id ?? null,
      fileDate: this.fileDate?.toString() ?? "",
      officePk: this.officePk,
      assetPk: this.assetPk,
      purchaseOrderPk: this.purchaseOrderPk,
      requestBy: this.byPesos ? "pesos" : "liters",
      liters: this.byPesos ? null : this.litres,
      pesos: this.byPesos ? this.pesos : null,
      wsWithdrawnBy: this.wsWithdrawnBy,
      wsWithdrawnByName: this.wsWithdrawnByName,
      wsRequestedBy: this.wsRequestedBy,
      wsApprovedBy: this.wsApprovedBy,
      risFundCluster: this.risFundCluster,
      risResponsibilityCenterCode: this.risResponsibilityCenterCode,
      risStockNumber: this.risStockNumber,
      risRemarks: this.risRemarks,
      risPurpose: this.risPurpose,
      risRequestedBy: this.risRequestedBy,
      risApprovedBy: this.risApprovedBy,
      risIssuedBy: this.risIssuedBy,
      risReceivedBy: this.risReceivedBy,
      driverPk: this.driverPk,
      driverName: this.driverName,
      passengers: this.passengers,
      destination: this.destination,
      dttPurpose: this.dttPurpose,
      travelFrom: this.travelFrom?.toString() ?? "",
      travelTo: this.travelTo?.toString() ?? "",
      travelHours: this.travelHours,
      dttRemarks: this.dttRemarks,
      departureTime: this.departureTime,
      tankBalanceBefore: this.tankBalanceBefore,
      purchasedLiters: this.purchasedLiters,
      oilLubricant: this.oilLubricant,
      odometerStart: this.odometerStart,
      dttApprovedBy: this.dttApprovedBy,
    }),
  );
}

function asItem(e: WithdrawalData["employees"][number]): PickerItem {
  return {
    value: String(e.employeePk),
    label: fullName(e),
    detail: e.positionTitle,
  };
}
