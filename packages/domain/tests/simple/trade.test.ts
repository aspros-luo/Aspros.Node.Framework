import {describe,expect,it} from "vitest";
import {Order,Trade,TradeRuleError} from "../../examples/simple/trade.js";
describe("Trade example",()=>{
 it("supports entity behavior and root orchestration / 支持实体自身行为和聚合根统一编排",()=>{
  const trade=new Trade(1,[new Order(10,"Phone",1,1000),new Order(11,"Tablet",1,2000)]);
  trade.getOrder(10).confirm();trade.confirmOrder(11);
  const refund=trade.refundOrder({refundId:90,orderId:10,reason:"requested",eventId:"evt-90",occurredAt:new Date("2026-01-01T00:00:00Z")});
  expect(refund.orderId).toBe(10);expect(refund.amountMinor).toBe(1000);expect(trade.getOrder(10).status).toBe("refunded");expect(trade.domainEvents).toHaveLength(1);
 });
 it("does not allow refunding an order that is not confirmed / 不允许退款未确认订单",()=>{
  const trade=new Trade(1,[new Order(10,"Phone",1,1000)]);
  expect(()=>trade.refundOrder({refundId:90,orderId:10,reason:"requested",eventId:"evt-90",occurredAt:new Date()})).toThrow(TradeRuleError);
  expect(trade.refunds).toHaveLength(0);
 });
});
