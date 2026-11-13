import type {DomainEvent} from "../events/domain-event.js";
import {Entity} from "./entity.js";
import {aggregateRootBrand} from "./entity-id.js";
import type {EntityId,IAggregateRoot} from "./entity-id.js";
/** Optional aggregate-root base class. / 可选的聚合根基类。
 * Adds event collection only; it does not manage child entities or transaction boundaries.
 * 仅增加事件收集；不管理内部实体，也不定义事务边界。
 */
export abstract class AggregateRoot<TId extends EntityId> extends Entity<TId> implements IAggregateRoot<TId>{
 public readonly [aggregateRootBrand]=true as const;
 private readonly pendingEvents:DomainEvent[]=[];
 /** Snapshot of pending events. / 尚未确认提交的事件快照。 */
 public get domainEvents():readonly DomainEvent[]{return [...this.pendingEvents];}
 /** Record an event raised by aggregate behavior. / 记录聚合行为产生的事件。 */
 protected addDomainEvent(event:DomainEvent):void{this.pendingEvents.push(event);}
 /** Clear only after successful Unit of Work commit. / 仅在 Unit of Work 成功提交后清空。 */
 public clearDomainEvents():void{this.pendingEvents.length=0;}
}
