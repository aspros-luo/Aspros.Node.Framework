/** Supported primitive identifier types. / 支持的基础标识符类型。
 * Use bigint/string for database BIGINT values beyond Number.MAX_SAFE_INTEGER.
 * 数据库 BIGINT 超过 Number.MAX_SAFE_INTEGER 时应使用 bigint/string。
 */
export type EntityId=string|number|bigint;
/** Entity identity contract. / 实体身份契约。 */
export interface IEntity<TId extends EntityId=EntityId>{readonly id:TId;}
/** Runtime-independent nominal marker for aggregate-root role. / 聚合根角色的跨 Runtime 名义标记。 */
export const aggregateRootBrand:unique symbol=Symbol("aspros.domain.aggregate-root");
/** Aggregate-root contract; custom roots can implement this without inheriting a base class. / 聚合根契约；自定义聚合根无需继承基类即可实现。 */
export interface IAggregateRoot<TId extends EntityId=EntityId> extends IEntity<TId>{readonly [aggregateRootBrand]:true;}
