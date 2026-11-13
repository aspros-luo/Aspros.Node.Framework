import {AggregateRoot,Entity,DomainError} from "../../src/index.js";
import type {DomainEvent} from "../../src/index.js";
export type OrderStatus="pending"|"confirmed"|"refunded";
export class TradeRuleError extends DomainError{public constructor(message:string,code:string){super(message,code);}}
export class Order extends Entity<number>{
 private currentStatus:OrderStatus="pending";
 public constructor(id:number,public readonly productName:string,public readonly quantity:number,public readonly unitPriceMinor:number){super(id);if(!Number.isInteger(quantity)||quantity<=0)throw new TradeRuleError("Quantity must be positive.","ORDER_INVALID_QUANTITY");if(!Number.isSafeInteger(unitPriceMinor)||unitPriceMinor<0)throw new TradeRuleError("Invalid unit price.","ORDER_INVALID_PRICE");}
 public get status():OrderStatus{return this.currentStatus;}
 public get totalMinor():number{return this.quantity*this.unitPriceMinor;}
 public confirm():void{if(this.currentStatus!=="pending")throw new TradeRuleError("Only pending orders can be confirmed.","ORDER_NOT_PENDING");this.currentStatus="confirmed";}
 public markRefunded():void{if(this.currentStatus!=="confirmed")throw new TradeRuleError("Only confirmed orders can be refunded.","ORDER_NOT_REFUNDABLE");this.currentStatus="refunded";}
}
export class Refund extends Entity<number>{public constructor(id:number,public readonly orderId:number,public readonly amountMinor:number,public readonly reason:string){super(id);if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)throw new TradeRuleError("Refund amount must be positive.","REFUND_INVALID_AMOUNT");}}
export interface OrderRefundedEvent extends DomainEvent{readonly tradeId:number;readonly orderId:number;readonly refundId:number;readonly amountMinor:number;}
export class Trade extends AggregateRoot<number>{
 private readonly orderItems:Order[];private readonly refundItems:Refund[];
 public constructor(id:number,orders:Order[],refunds:Refund[]=[]){super(id);this.orderItems=[...orders];this.refundItems=[...refunds];}
 /** Read-only snapshots; entities retain their own behavior. / 只读集合快照；实体仍保留自身行为。 */
 public get orders():readonly Order[]{return [...this.orderItems];}
 public get refunds():readonly Refund[]{return [...this.refundItems];}
 public getOrder(orderId:number):Order{const order=this.orderItems.find(x=>x.id===orderId);if(!order)throw new TradeRuleError("Order does not belong to this trade.","ORDER_NOT_IN_TRADE");return order;}
 /** Root orchestration is a business choice, not a framework rule. / 根统一编排是业务选择，不是框架规则。 */
 public confirmOrder(orderId:number):void{this.getOrder(orderId).confirm();}
 public refundOrder(input:{refundId:number;orderId:number;reason:string;eventId:string;occurredAt:Date}):Refund{
  const order=this.getOrder(input.orderId);
  // Construct first so invalid refund data cannot leave the order partially changed.
  // 先构造退款实体，避免退款数据无效时订单状态已被部分修改。
  const refund=new Refund(input.refundId,order.id,order.totalMinor,input.reason);
  order.markRefunded();this.refundItems.push(refund);
  const event:OrderRefundedEvent={eventId:input.eventId,eventType:"trade.order-refunded",occurredAt:input.occurredAt,eventVersion:1,tradeId:this.id,orderId:order.id,refundId:refund.id,amountMinor:refund.amountMinor};this.addDomainEvent(event);return refund;
 }
}
