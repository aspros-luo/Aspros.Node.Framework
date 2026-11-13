import type { EntityId, IEntity } from "./entity-id.js";
/** Optional Entity base class. / 可选的 Entity 基类。
 * Equality uses concrete runtime type and ID, not mutable attributes.
 * 相等性基于运行时具体类型和 ID，不比较可变属性。
 * @typeParam TId Entity identifier type / 实体标识符类型
 */
export abstract class Entity<TId extends EntityId> implements IEntity<TId> {
  public readonly id: TId;
  protected constructor(id: TId) {
    if (typeof id === "number" && !Number.isFinite(id)) throw new TypeError("Entity identifier must be a finite number.");
    this.id = id;
  }
  /** Compare identity, not mutable state. / 比较身份，而不是可变状态。 */
  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return Object.getPrototypeOf(this) === Object.getPrototypeOf(other) && Object.is(this.id, other.id);
  }
}
