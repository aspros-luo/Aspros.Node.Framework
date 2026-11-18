import { Order, Trade } from "./trade.js";

/**
 * Demonstrates Domain behavior only; persistence is intentionally outside this example.
 * 这里只演示领域行为；持久化刻意留在本示例之外。
 */
export function runSimpleTradeExample(): Trade {
  const trade = new Trade(1001, [
    new Order(501, "iPhone 16", 1, 79900),
    new Order(502, "iPad", 1, 59900),
  ]);

  // Direct entity behavior and root orchestration are both valid business choices.
  // 直接调用实体行为和由聚合根统一编排，都是合理的业务选择。
  trade.getOrder(501).confirm();
  trade.confirmOrder(502);

  trade.refundOrder({
    refundId: 9001,
    orderId: 501,
    reason: "Customer requested refund",
    eventId: "evt-trade-1001-refund-9001",
    occurredAt: new Date("2026-11-13T00:00:00.000Z"),
  });

  // The outer persistence layer clears events only after a successful commit.
  // 外层持久化层仅在成功 Commit 后清空事件。
  return trade;
}
