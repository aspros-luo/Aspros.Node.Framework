import type { EntityManager } from "@mikro-orm/mysql";
import type { IRepository } from "../../../packages/domain/src/index.js";
import type { Trade } from "../../../packages/domain/examples/simple/trade.js";
import { OrderRecord, RefundRecord, TradeRecord, type TradePersistenceSnapshot } from "./records.js";
import { TradeMapper } from "./trade-mapper.js";

/**
 * MikroORM adapter for the example Trade aggregate.
 * 面向示例 Trade 聚合的 MikroORM 适配器。
 *
 * This adapter stages changes in the supplied EntityManager. The caller must
 * provide an EntityManager owned by an active TradePocUnitOfWork.
 * 此适配器在传入的 EntityManager 中暂存变更。调用方必须传入由活动
 * TradePocUnitOfWork 所拥有的 EntityManager。
 */
export class MikroOrmTradeRepository implements IRepository<Trade, number> {
  public constructor(private readonly em: EntityManager) {}

  /** Restore the complete aggregate graph required by Trade behavior. / 还原 Trade 行为所需的完整聚合对象图。 */
  public async findById(id: number): Promise<Trade | null> {
    const trade = await this.em.findOne(TradeRecord, { id });
    if (!trade) return null;

    // Keep operations sequential on one EntityManager/transaction context.
    // 在同一个 EntityManager/事务上下文中顺序执行查询。
    const orders = await this.em.find(
      OrderRecord,
      { trade: id },
      { populate: ["trade"] },
    );
    const refunds = await this.em.find(
      RefundRecord,
      { trade: id },
      { populate: ["trade", "order", "order.trade"] },
    );

    const snapshot: TradePersistenceSnapshot = { trade, orders, refunds };
    return TradeMapper.toDomain(snapshot);
  }

  /**
   * Stage an insert or update without flushing or committing.
   * 暂存新增或更新，不执行 Flush，也不提交事务。
   *
   * Child deletion is intentionally unsupported because the current Domain
   * aggregate exposes no removal behavior. A missing persisted child is treated
   * as a consistency error rather than silently deleted.
   * 当前 Domain 聚合没有删除子实体的行为，因此此处不支持删除子记录。
   * 已持久化的子记录若在聚合快照中缺失，将作为一致性错误处理，不会静默删除。
   */
  public async save(aggregate: Trade): Promise<void> {
    if (!this.em.isInTransaction()) {
      throw new Error("MikroOrmTradeRepository.save requires an active Unit of Work transaction.");
    }

    const desired = TradeMapper.toPersistence(aggregate);
    const existingTrade = await this.em.findOne(TradeRecord, { id: aggregate.id });

    if (!existingTrade) {
      await this.assertNoForeignKeyCollisions(desired);
      this.em.persist(desired.trade);
      for (const order of desired.orders) this.em.persist(order);
      for (const refund of desired.refunds) this.em.persist(refund);
      return;
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
