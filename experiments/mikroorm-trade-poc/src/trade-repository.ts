import type { EntityManager } from "@mikro-orm/mysql";
import type { IRepository } from "../../../packages/domain/src/index.js";
import type { Trade } from "../../../packages/domain/examples/simple/trade.js";
import { OrderRecord, RefundRecord, TradeRecord, type TradePersistenceSnapshot } from "./records.js";
import { TradeMapper } from "./trade-mapper.js";

/**
 * Query-only MikroORM adapter for the example Trade aggregate.
 * 示例 Trade 聚合的只读 MikroORM 仓储适配器。
 *
 * It never stages or saves changes; IUnitOfWork owns all write registration.
 * 它不登记或保存变更；所有写入登记均由 IUnitOfWork 负责。
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
}
