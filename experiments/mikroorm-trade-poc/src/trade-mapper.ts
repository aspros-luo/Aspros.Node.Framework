import {
  Order,
  Refund,
  Trade,
  type OrderStatus,
} from "../../../packages/domain/examples/simple/trade.js";
import {
  OrderRecord,
  RefundRecord,
  TradeRecord,
  type TradePersistenceSnapshot,
} from "./records.js";

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer.`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer.`);
  }
}

/**
 * Validate storage relationships before constructing domain objects.
 * 在创建领域对象前验证持久化关系的一致性。
 */
function validateSnapshot(snapshot: TradePersistenceSnapshot): void {
  assertPositiveSafeInteger(snapshot.trade.id, "trade.id");

  const ordersById = new Map<number, OrderRecord>();
  for (const record of snapshot.orders) {
    assertPositiveSafeInteger(record.id, "order.id");
    assertPositiveSafeInteger(record.trade.id, "order.trade.id");
    if (record.trade.id !== snapshot.trade.id) {
      throw new TypeError(`Order ${record.id} belongs to another trade.`);
    }
    if (ordersById.has(record.id)) {
      throw new TypeError(`Duplicate order id: ${record.id}.`);
    }
    if (!Number.isInteger(record.quantity) || record.quantity <= 0) {
      throw new TypeError(`Order ${record.id} has an invalid quantity.`);
    }
    assertNonNegativeSafeInteger(record.unitPriceMinor, "order.unitPriceMinor");
    if (!["pending", "confirmed", "refunded"].includes(record.status)) {
      throw new TypeError(`Order ${record.id} has an unknown status.`);
    }
    const totalMinor = record.quantity * record.unitPriceMinor;
    if (!Number.isSafeInteger(totalMinor)) {
      throw new TypeError(`Order ${record.id} total exceeds the safe integer range.`);
    }
    ordersById.set(record.id, record);
  }

  const refundsByOrderId = new Map<number, RefundRecord>();
  const refundIds = new Set<number>();
  for (const record of snapshot.refunds) {
    assertPositiveSafeInteger(record.id, "refund.id");
    assertPositiveSafeInteger(record.trade.id, "refund.trade.id");
    assertPositiveSafeInteger(record.order.id, "refund.order.id");
    assertPositiveSafeInteger(record.amountMinor, "refund.amountMinor");

    if (record.trade.id !== snapshot.trade.id || record.order.trade.id !== snapshot.trade.id) {
      throw new TypeError(`Refund ${record.id} references a different trade.`);
    }
    if (refundIds.has(record.id)) {
      throw new TypeError(`Duplicate refund id: ${record.id}.`);
    }
    if (refundsByOrderId.has(record.order.id)) {
      throw new TypeError(`Order ${record.order.id} has multiple refunds.`);
    }

    const order = ordersById.get(record.order.id);
    if (!order) {
      throw new TypeError(`Refund ${record.id} references an order outside the aggregate.`);
    }
    if (order.status !== "refunded") {
      throw new TypeError(`Refund ${record.id} references an order that is not refunded.`);
    }
    if (record.amountMinor !== order.quantity * order.unitPriceMinor) {
      throw new TypeError(`Refund ${record.id} amount does not match the refunded order total.`);
    }

    refundIds.add(record.id);
    refundsByOrderId.set(record.order.id, record);
  }

  for (const order of snapshot.orders) {
    if (order.status === "refunded" && !refundsByOrderId.has(order.id)) {
      throw new TypeError(`Refunded order ${order.id} has no refund record.`);
    }
    if (order.status !== "refunded" && refundsByOrderId.has(order.id)) {
      throw new TypeError(`Non-refunded order ${order.id} has a refund record.`);
    }
  }
}

/**
 * Explicit anti-corruption mapper between MikroORM records and Domain.
 * 在 MikroORM 持久化记录与 Domain 之间进行显式防腐映射。
 */
export class TradeMapper {
  public static toDomain(snapshot: TradePersistenceSnapshot): Trade {
    validateSnapshot(snapshot);

    const orders = snapshot.orders.map((record) => {
      const order = new Order(
        record.id,
        record.productName,
        record.quantity,
        record.unitPriceMinor,
      );

      const status = record.status as OrderStatus;
      if (status === "confirmed" || status === "refunded") {
        order.confirm();
      }
      if (status === "refunded") {
        order.markRefunded();
      }
      return order;
    });

    const refunds = snapshot.refunds.map(
      (record) =>
        new Refund(
          record.id,
          record.order.id,
          record.amountMinor,
          record.reason,
        ),
    );

    // Domain constructors initialize the aggregate brand and an empty event collection.
    // Domain 构造函数会初始化聚合根标记和空的领域事件集合。
    return new Trade(snapshot.trade.id, orders, refunds);
  }

  public static toPersistence(aggregate: Trade): TradePersistenceSnapshot {
    const trade = Object.assign(new TradeRecord(), { id: aggregate.id });
    const orderRecords = aggregate.orders.map((order) =>
      Object.assign(new OrderRecord(), {
        id: order.id,
        trade,
        productName: order.productName,
        quantity: order.quantity,
        unitPriceMinor: order.unitPriceMinor,
        status: order.status,
      }),
    );

    const ordersById = new Map(orderRecords.map((order) => [order.id, order]));
    const refundRecords = aggregate.refunds.map((refund) => {
      const order = ordersById.get(refund.orderId);
      if (!order) {
        throw new TypeError(`Refund ${refund.id} references an order outside the aggregate.`);
      }
      return Object.assign(new RefundRecord(), {
        id: refund.id,
        trade,
        order,
        amountMinor: refund.amountMinor,
        reason: refund.reason,
      });
    });

    const snapshot: TradePersistenceSnapshot = {
      trade,
      orders: orderRecords,
      refunds: refundRecords,
    };
    validateSnapshot(snapshot);
    return snapshot;
  }
}
