import type { EntityId, IAggregateRoot } from "../entities/entity-id.js";

/**
 * Persistence-neutral query contract for one aggregate-root type.
 * 面向单一聚合根类型、与持久化技术无关的查询契约。
 *
 * Persistence registration and saving belong to IUnitOfWork, not Repository.
 * 持久化变更登记与保存属于 IUnitOfWork，而不是 Repository。
 */
export interface IRepository<TAggregate extends IAggregateRoot<TId>, TId extends EntityId> {
  /** Find a complete aggregate; null when absent. / 查找完整聚合；不存在时返回 null。 */
  findById(id: TId): Promise<TAggregate | null>;
}
