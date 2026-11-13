/**
 * Supported primitive identifier types. / 支持的基础标识符类型。
 * Large database BIGINT values should use bigint or string beyond Number.MAX_SAFE_INTEGER.
 * 数据库 BIGINT 超过 Number.MAX_SAFE_INTEGER 时应使用 bigint 或 string。
 */
export type EntityId = string | number | bigint;
/** Entity identity contract / 实体身份契约。 */
export interface IEntity<TId extends EntityId = EntityId> { readonly id: TId; }
/** Aggregate-root role contract / 聚合根角色契约。 */
export interface IAggregateRoot<TId extends EntityId = EntityId> extends IEntity<TId> {}
