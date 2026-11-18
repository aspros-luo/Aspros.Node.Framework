import { describe, expect, it } from "vitest";
import { assertSafeTradePocMigrationStart } from "../src/migration-runner.js";

describe("Trade POC migration recovery guard", () => {
  it("allows a first migration when none of its target tables exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration001_CreateTradeSchema",
            targetTables: ["trades", "orders"],
          },
        ],
        [],
      ),
    ).not.toThrow();
  });

  it("refuses to run when a pending migration's own target table already exists", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            targetTables: ["payments", "payment_events"],
          },
        ],
        ["trades", "payments"],
      ),
    ).toThrow(/Migration002_AddPayments.*target tables already exist/i);
  });

  it("allows a later migration when only tables from earlier migrations exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            targetTables: ["payments", "payment_events"],
          },
        ],
        ["trades", "orders"],
      ),
    ).not.toThrow();
  });

  it("checks each pending migration against its own target tables", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            targetTables: ["payments"],
          },
          {
            name: "Migration003_AddOutbox",
            targetTables: ["outbox_messages"],
          },
        ],
        ["trades", "outbox_messages"],
      ),
    ).toThrow(/Migration003_AddOutbox.*outbox_messages/i);
  });

  it("allows an already applied migration because it is not in the pending set", () => {
    expect(() =>
      assertSafeTradePocMigrationStart([], ["trades", "orders", "refunds"]),
    ).not.toThrow();
  });
});
