import { describe, expect, it } from "vitest";
import { assertSafeTradePocMigrationStart } from "../src/migration-runner.js";

describe("Trade POC migration recovery guard", () => {
  it("allows a first migration when none of its target tables exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        ["Migration20261117000100_CreateTradePocSchema"],
        [],
        [],
      ),
    ).not.toThrow();
  });

  it("refuses to rerun when target tables exist without an executed-history record", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        ["Migration20261117000100_CreateTradePocSchema"],
        [],
        ["orders", "trades"],
      ),
    ).toThrow(/already exist without an executed migration record/i);
  });

  it("allows an already executed migration even when its target tables exist", () => {
    expect(() =>
      assertSafeTradePocMigrationStart(
        [],
        ["Migration20261117000100_CreateTradePocSchema"],
        ["orders", "trades", "refunds", "poc_audit"],
      ),
    ).not.toThrow();
  });
});
