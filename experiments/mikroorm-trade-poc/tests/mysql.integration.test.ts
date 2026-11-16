import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Order, Refund, Trade } from "../../../packages/domain/examples/simple/trade.js";
import { createTradePocOrm } from "../src/bootstrap.js";
import { TradeMapper } from "../src/trade-mapper.js";
import { OrderRecord, RefundRecord, TradeRecord } from "../src/records.js";

const clientUrl = process.env.MYSQL_POC_DATABASE_URL;

describe.skipIf(!clientUrl)("MikroORM MySQL Trade persistence", () => {
  const ormPromise = createTradePocOrm({ clientUrl: clientUrl! });

  afterAll(async () => {
    const orm = await ormPromise;
    await orm.close(true);
  });

  it("persists and reloads a complete aggregate in a fresh EntityManager", async () => {
    const orm = await ormPromise;
    const tradeId = randomInt(1, 2_000_000_000);
    const pendingOrderId = randomInt(1, 2_000_000_000);
    const refundedOrderId = randomInt(1, 2_000_000_000);
    const refundId = randomInt(1, 2_000_000_000);

    const pendingOrder = new Order(pendingOrderId, "Keyboard", 2, 4500);
    const refundedOrder = new Order(refundedOrderId, "Mouse", 1, 2500);
    refundedOrder.confirm();
    refundedOrder.markRefunded();

    const aggregate = new Trade(tradeId, [pendingOrder, refundedOrder], [
      new Refund(refundId, refundedOrderId, 2500, "Customer request"),
    ]);
    const snapshot = TradeMapper.toPersistence(aggregate);
    const writer = orm.em.fork({ clear: true });

    try {
      writer.persist(snapshot.trade);
      for (const order of snapshot.orders) writer.persist(order);
      for (const refund of snapshot.refunds) writer.persist(refund);
      await writer.flush();

      // A fresh identity map proves the result comes from MySQL, not the writer's managed objects.
      // 使用全新的 Identity Map，确保结果来自 MySQL，而不是写入上下文中的托管对象。
      const reader = orm.em.fork({ clear: true });
      try {
        const tradeRecord = await reader.findOneOrFail(TradeRecord, { id: tradeId });
        const orders = await reader.find(OrderRecord, { trade: tradeId });
        const refunds = await reader.find(
          RefundRecord,
          { trade: tradeId },
          { populate: ["trade", "order", "order.trade"] },
        );

        const restored = TradeMapper.toDomain({
          trade: tradeRecord,
          orders,
          refunds,
        });

        expect(restored.id).toBe(tradeId);
        expect(restored.orders.map((order) => order.status).sort()).toEqual([
          "pending",
          "refunded",
        ]);
        expect(restored.refunds).toHaveLength(1);
        expect(restored.domainEvents).toHaveLength(0);
      } finally {
        reader.clear();
      }
    } finally {
      // Remove only rows created by this test, in FK-safe order.
      // 只删除本测试创建的记录，并遵守外键依赖顺序。
      const cleanup = orm.em.fork({ clear: true });
      try {
        await cleanup.nativeDelete(RefundRecord, { trade: tradeId });
        await cleanup.nativeDelete(OrderRecord, { trade: tradeId });
        await cleanup.nativeDelete(TradeRecord, { id: tradeId });
      } finally {
        cleanup.clear();
        writer.clear();
      }
    }
  });
});
