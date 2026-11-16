import { defineEntity, p } from "@mikro-orm/core";

/**
 * Persistence records describe relational storage, not domain behavior.
 * 持久化记录描述关系型存储结构，不承载领域行为。
 */
const TradeRecordSchema = defineEntity({
  name: "TradeRecord",
  tableName: "trades",
  properties: {
    id: p.integer().primary(),
  },
});

export class TradeRecord extends TradeRecordSchema.class {}
TradeRecordSchema.setClass(TradeRecord);

const OrderRecordSchema = defineEntity({
  name: "OrderRecord",
  tableName: "orders",
  properties: {
    id: p.integer().primary(),
    trade: () => p.manyToOne(TradeRecord).joinColumn("trade_id"),
    productName: p.string().fieldName("product_name"),
    quantity: p.integer(),
    unitPriceMinor: p.integer().fieldName("unit_price_minor"),
    status: p.enum(["pending", "confirmed", "refunded"]),
  },
});

export class OrderRecord extends OrderRecordSchema.class {}
OrderRecordSchema.setClass(OrderRecord);

const RefundRecordSchema = defineEntity({
  name: "RefundRecord",
  tableName: "refunds",
  properties: {
    id: p.integer().primary(),
    trade: () => p.manyToOne(TradeRecord).joinColumn("trade_id"),
    order: () => p.manyToOne(OrderRecord).joinColumn("order_id"),
    amountMinor: p.integer().fieldName("amount_minor"),
    reason: p.text(),
  },
});

export class RefundRecord extends RefundRecordSchema.class {}
RefundRecordSchema.setClass(RefundRecord);

/** Metadata registered by the isolated MikroORM experiment. / 独立 MikroORM 实验注册的元数据。 */
export const tradeRecordEntities = [
  TradeRecord,
  OrderRecord,
  RefundRecord,
] as const;

/** Fully loaded persistence graph required to restore one Trade aggregate. / 还原一个 Trade 聚合所需的完整持久化对象图。 */
export interface TradePersistenceSnapshot {
  readonly trade: TradeRecord;
  readonly orders: readonly OrderRecord[];
  readonly refunds: readonly RefundRecord[];
}
