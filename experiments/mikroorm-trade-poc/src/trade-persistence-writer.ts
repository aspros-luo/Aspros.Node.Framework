import type { EntityManager } from "@mikro-orm/mysql";
import type { Trade } from "../../../packages/domain/examples/simple/trade.js";
import { OrderRecord, RefundRecord, TradeRecord, type TradePersistenceSnapshot } from "./records.js";
import { TradeMapper } from "./trade-mapper.js";

/**
 * Internal persistence writer used only by the Unit of Work commit pipeline.
 * 仅由 Unit of Work Commit 流程调用的内部持久化写入器。
 *
 * This module is deliberately not exposed through Repository.
 * 此模块刻意不通过 Repository 对外暴露。
 */
export class MikroOrmTradePersistenceWriter {
  public constructor(private readonly em: EntityManager) {}

  public async persistNew(aggregate: Trade): Promise<void> {
    const desired = TradeMapper.toPersistence(aggregate);
    await this.assertNoForeignKeyCollisions(desired);
    this.em.persist(desired.trade);
    for (const order of desired.orders) this.em.persist(order);
    for (const refund of desired.refunds) this.em.persist(refund);
  }

  public async persistDirty(aggregate: Trade): Promise<void> {
    const desired = TradeMapper.toPersistence(aggregate);
    const existingTrade = await this.em.findOne(TradeRecord, { id: aggregate.id });
    if (!existingTrade) {
      throw new Error(`Cannot register Trade ${aggregate.id} as dirty because it does not exist.`);
    }

    // Do not issue concurrent queries through one transactional EntityManager.
    // 不要通过同一个事务 EntityManager 并发发起查询。
    const existingOrders = await this.em.find(
      OrderRecord,
      { trade: aggregate.id },
      { populate: ["trade"] },
    );
    const existingRefunds = await this.em.find(
      RefundRecord,
      { trade: aggregate.id },
      { populate: ["trade", "order", "order.trade"] },
    );

    const desiredOrderIds = new Set(desired.orders.map((record) => record.id));
    const desiredRefundIds = new Set(desired.refunds.map((record) => record.id));
    for (const record of existingOrders) {
      if (!desiredOrderIds.has(record.id)) {
        throw new Error(`Trade ${aggregate.id} snapshot omits persisted Order ${record.id}; removal is not supported.`);
      }
    }
    for (const record of existingRefunds) {
      if (!desiredRefundIds.has(record.id)) {
        throw new Error(`Trade ${aggregate.id} snapshot omits persisted Refund ${record.id}; removal is not supported.`);
      }
    }

    const ordersById = new Map(existingOrders.map((record) => [record.id, record]));
    const managedOrders = new Map<number, OrderRecord>();
    for (const incoming of desired.orders) {
      const current = ordersById.get(incoming.id);
      if (current) {
        current.productName = incoming.productName;
        current.quantity = incoming.quantity;
        current.unitPriceMinor = incoming.unitPriceMinor;
        current.status = incoming.status;
        managedOrders.set(current.id, current);
        continue;
      }

      const collision = await this.em.findOne(OrderRecord, { id: incoming.id });
      if (collision) {
        throw new Error(`Order id ${incoming.id} is already owned by another Trade.`);
      }
      incoming.trade = existingTrade;
      this.em.persist(incoming);
      managedOrders.set(incoming.id, incoming);
    }

    const refundsById = new Map(existingRefunds.map((record) => [record.id, record]));
    for (const incoming of desired.refunds) {
      const order = managedOrders.get(incoming.order.id);
      if (!order) {
        throw new Error(`Refund ${incoming.id} references an Order that is not part of Trade ${aggregate.id}.`);
      }

      const current = refundsById.get(incoming.id);
      if (current) {
        current.amountMinor = incoming.amountMinor;
        current.reason = incoming.reason;
        current.trade = existingTrade;
        current.order = order;
        continue;
      }

      const collision = await this.em.findOne(RefundRecord, { id: incoming.id });
      if (collision) {
        throw new Error(`Refund id ${incoming.id} is already owned by another Trade.`);
      }
      incoming.trade = existingTrade;
      incoming.order = order;
      this.em.persist(incoming);
    }
  }

  public async persistDeleted(aggregate: Trade): Promise<void> {
    const existingTrade = await this.em.findOne(TradeRecord, { id: aggregate.id });
    if (!existingTrade) return;

    // Stage dependent removals in the same Unit of Work flush.
    // 将依赖记录的删除也暂存到同一次 Unit of Work Flush 中。
    const refunds = await this.em.find(RefundRecord, { trade: aggregate.id });
    const orders = await this.em.find(OrderRecord, { trade: aggregate.id });
    for (const refund of refunds) this.em.remove(refund);
    for (const order of orders) this.em.remove(order);
    this.em.remove(existingTrade);
  }

  private async assertNoForeignKeyCollisions(snapshot: TradePersistenceSnapshot): Promise<void> {
    for (const order of snapshot.orders) {
      if (await this.em.findOne(OrderRecord, { id: order.id })) {
        throw new Error(`Order id ${order.id} is already in use.`);
      }
    }
    for (const refund of snapshot.refunds) {
      if (await this.em.findOne(RefundRecord, { id: refund.id })) {
        throw new Error(`Refund id ${refund.id} is already in use.`);
      }
    }
  }
}
