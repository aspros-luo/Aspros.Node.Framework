import type { EntityId, IAggregateRoot } from "../entities/entity-id.js";
/** Persistence-neutral repository contract for one aggregate-root type. / 面向单一聚合根类型且与持久化技术无关的仓储契约。
 * findById should restore state required to enforce aggregate invariants.
 * findById 应恢复维护聚合不变量所需的状态。
 */
export interface IRepository<TAggregate extends IAggregateRoot<TId>, TId extends EntityId> {
  /** Find a complete aggregate; null when absent. / 查找完整聚合；不存在时返回 null。 */
  findById(id:TId):Promise<TAggregate|null>;
  /** Add or update in the current persistence context. / 在当前持久化上下文中新增或更新。 */
  save(aggregate:TAggregate):Promise<void>;
}
