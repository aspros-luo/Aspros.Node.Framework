import { describe, expect, it } from "vitest";
import { createTradePocOrm } from "../src/bootstrap.js";

describe("Trade POC bootstrap validation", () => {
  it("rejects a non-MySQL connection URL before attempting a connection", async () => {
    await expect(
      createTradePocOrm({ clientUrl: "postgresql://localhost/not-the-poc" }),
    ).rejects.toThrow(/requires a mysql/i);
  });

  it("rejects any database other than the dedicated POC database", async () => {
    await expect(
      createTradePocOrm({ clientUrl: "mysql://localhost/production" }),
    ).rejects.toThrow(/aspros_trade_poc/i);
  });
});
