/** Coordinates persistence changes in one application operation. / 协调一次应用操作期间产生的持久化变更。
 * Contract only: transaction mechanics, tracking and event dispatch belong to outer layers.
 * 这里只定义契约；事务机制、跟踪和事件投递由外层实现。
 */
export interface IUnitOfWork {
  /** Persist tracked changes atomically when supported. / 在支持的情况下原子性持久化跟踪变更。 */
  commit():Promise<void>;
  /** Abandon the current unit of work. / 放弃当前工作单元。 */
  rollback():Promise<void>;
}
