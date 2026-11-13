import {InMemoryTradeRepository} from "./trade-repository.js";
import {InMemoryUnitOfWork} from "./in-memory-unit-of-work.js";
import {Order,Trade} from "./trade.js";
/** Example orchestration, not an implementation of the Application layer. / 示例编排，不代表 Application 层实现。 */
export async function runSimpleTradeExample():Promise<void>{
 const repository=new InMemoryTradeRepository();const uow=new InMemoryUnitOfWork();
 const trade=new Trade(1001,[new Order(501,"iPhone 16",1,79900),new Order(502,"iPad",1,59900)]);
 await repository.save(trade);await uow.commit();
 const loaded=await repository.findById(1001);if(!loaded)throw new Error("Trade not found.");
 // Direct entity behavior and root orchestration are both valid business choices.
 // 直接调用实体行为和由聚合根统一编排，都是合理的业务选择。
 loaded.getOrder(501).confirm();loaded.confirmOrder(502);
 loaded.refundOrder({refundId:9001,orderId:501,reason:"Customer requested refund",eventId:"evt-trade-1001-refund-9001",occurredAt:new Date("2026-11-13T00:00:00.000Z")});
 await repository.save(loaded);await uow.commit();
 // A real implementation clears events only after commit succeeds.
 // 真实实现只有在提交成功后才清空事件。
 loaded.clearDomainEvents();
}
