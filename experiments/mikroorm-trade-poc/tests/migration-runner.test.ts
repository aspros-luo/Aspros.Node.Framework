import { describe, expect, it } from "vitest";
import {
  assertKnownTradePocMigrations,
  assertSafeTradePocMigrationStart,
  findUnknownTradePocMigrations,
} from "../src/migration-runner.js";

describe("Trade POC migration recovery guard", () => {
  it("allows a first migration when none of its declared new tables exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration001_CreateTradeSchema",
            createdTables: ["trades", "orders"],
          },
        ],
        [],
      ),
    ).not.toThrow();
  });

  it("refuses to run when a pending migration's declared new table already exists", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            createdTables: ["payments", "payment_events"],
          },
        ],
        ["trades", "payments"],
      ),
    ).toThrow(/Migration002_AddPayments.*tables it is expected to create already exist/i);
  });

  it("allows a later migration when only tables created by earlier migrations exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            createdTables: ["payments", "payment_events"],
          },
        ],
        ["trades", "orders"],
      ),
    ).not.toThrow();
  });

  it("checks each pending migration against its own declared new tables", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration002_AddPayments",
            createdTables: ["payments"],
          },
          {
            name: "Migration003_AddOutbox",
            createdTables: ["outbox_messages"],
          },
        ],
        ["trades", "outbox_messages"],
      ),
    ).toThrow(/Migration003_AddOutbox.*outbox_messages/i);
  });

  it("does not treat an existing table altered by a migration as a newly created table", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [
          {
            name: "Migration004_AddTradeColumn",
            createdTables: [],
          },
        ],
        ["trades"],
      ),
    ).not.toThrow();
  });

  it("allows an already applied migration because it is not in the pending set", () => {
    expect(() =>
      assertSafeTradePocMigrationStart([], ["trades", "orders", "refunds"]),
    ).not.toThrow();
  });
});


describe("Trade POC migration history compatibility", () => {
  it("recognizes migration history entries registered by this application version", () => {
    expect(findUnknownTradePocMigrations([
      "Migration20261117000100_CreateTradePocSchema",
    ])).toEqual([]);
    expect(() => assertKnownTradePocMigrations([
      "Migration20261117000100_CreateTradePocSchema",
    ])).not.toThrow();
  });

  it("reports and refuses migration history entries unknown to this application version", () => {
    const executed = [
      "Migration20261117000100_CreateTradePocSchema",
      "Migration20261118000200_AddOutbox",
    ];

    expect(findUnknownTradePocMigrations(executed)).toEqual([
      "Migration20261118000200_AddOutbox",
    ]);
    expect(() => assertKnownTradePocMigrations(executed)).toThrow(
      /unknown to this application version.*Migration20261118000200_AddOutbox/i,
    );
  });

  it("normalizes migration file extensions before comparing history", () => {
    expect(findUnknownTradePocMigrations([
      "Migration20261117000100_CreateTradePocSchema.js",
    ])).toEqual([]);
  });

  it("does not report the same unknown migration more than once", () => {
    expect(findUnknownTradePocMigrations([
      "Migration20261118000200_AddOutbox",
      "Migration20261118000200_AddOutbox.js",
    ])).toEqual(["Migration20261118000200_AddOutbox"]);
  });
});
