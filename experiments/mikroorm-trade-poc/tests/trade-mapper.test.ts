import { describe, expect, it } from "vitest";
import { Order, Refund, Trade } from "../../../packages/domain/examples/simple/trade.js";
import { TradeMapper } from "../src/trade-mapper.js";
import { OrderRecord, RefundRecord, TradeRecord } from "../src/records.js";

function createAggregate(): Trade {
  const pending = new Order(101, "Keyboard", 2, 4500);
  const refunded = new Order(102, "Mouse", 1, 2500);
  refunded.confirm();
  refunded.markRefunded();

  return new Trade(1, [pending, refunded], [
    new Refund(501, 102, 2500, "Customer request"),
  ]);
}

describe("TradeMapper", () => {
  it("round-trips a complete aggregate without replaying historical events", () => {
    const original = createAggregate();
    const persisted = TradeMapper.toPersistence(original);
    const restored = TradeMapper.toDomain(persisted);

    expect(restored.id).toBe(1);
    expect(restored.orders.map((order) => order.status)).toEqual([
      "pending",
      "refunded",
    ]);
    expect(restored.refunds).toHaveLength(1);
    expect(restored.domainEvents).toHaveLength(0);
  });

  it("maps domain objects to independent persistence records", () => {
    const persisted = TradeMapper.toPersistence(createAggregate());

    expect(persisted.trade).toBeInstanceOf(TradeRecord);
    expect(persisted.orders[0]).toBeInstanceOf(OrderRecord);
    expect(persisted.refunds[0]).toBeInstanceOf(RefundRecord);
    expect(persisted.orders[0].trade).toBe(persisted.trade);
    expect(persisted.refunds[0].order).toBe(persisted.orders[1]);
  });

  it("rejects a refund attached to an order outside the aggregate", () => {
    const persisted = TradeMapper.toPersistence(createAggregate());
    const foreignOrder = Object.assign(new OrderRecord(), {
      id: 999,
      trade: Object.assign(new TradeRecord(), { id: 2 }),
    });
    const invalidRefund = Object.assign(new RefundRecord(), {
      id: 502,
      trade: persisted.trade,
      order: foreignOrder,
      amountMinor: 100,
      reason: "invalid",
    });

    expect(() =>
      TradeMapper.toDomain({
        ...persisted,
        refunds: [...persisted.refunds, invalidRefund],
      }),
    ).toThrow(/different trade|outside the aggregate/i);
  });

  it("rejects a refunded order without a refund record", () => {
    const persisted = TradeMapper.toPersistence(createAggregate());
    expect(() =>
      TradeMapper.toDomain({
        ...persisted,
        refunds: [],
      }),
    ).toThrow(/has no refund record/i);
  });

  it("does not accept a refund when the order status is still pending", () => {
    const persisted = TradeMapper.toPersistence(createAggregate());
    const order = persisted.orders[0];
    if (!order) throw new Error("Expected first order record.");

    const invalidRefund = Object.assign(new RefundRecord(), {
      id: 502,
      trade: persisted.trade,
      order,
      amountMinor: 9000,
      reason: "invalid",
    });

    expect(() =>
      TradeMapper.toDomain({
        ...persisted,
        refunds: [...persisted.refunds, invalidRefund],
      }),
    ).toThrow(/not refunded/i);
  });
});
