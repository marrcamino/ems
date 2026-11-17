import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  smallint,
  unique,
} from "drizzle-orm/mysql-core";

// The last number given out for each form in each year; every count starts
// over in January. A save raises the count inside its own transaction, which
// holds the row until it commits, so two saves at once never get the same
// number. The RIS count also serves the RIS numbers reserved on the RIS
// Numbers page, since they share one numbering (point 6 of "Recording a fuel
// issuance" in fuel-purchase-orders.md). The rows of the go-live year are
// written once by the starting-numbers step (point 6.6).
export const formCounter = mysqlTable(
  "form_counter",
  {
    formCounterPk: bigint("form_counter_pk", {
      mode: "number",
      unsigned: true,
    })
      .primaryKey()
      .autoincrement(),
    form: mysqlEnum("form", ["control", "ws", "ris", "dtt"]).notNull(),
    year: smallint("year", { unsigned: true }).notNull(),
    lastNumber: int("last_number", { unsigned: true }).notNull(),
  },
  (t) => [unique("fc_form_year_unique").on(t.form, t.year)],
);
