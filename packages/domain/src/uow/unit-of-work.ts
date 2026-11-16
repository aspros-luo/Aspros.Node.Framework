/**
 * Coordinates explicitly registered persistence changes for one work scope.
 * 协调一个工作范围内显式登记的持久化变更。
 *
 * Register methods only stage intent; commit performs persistence.
 * Register 方法只登记意图；真正的持久化由 Commit 执行。
 * Explicit transactions are opt-in and are disabled by default.
 * 显式事务为可选能力，默认关闭。
 */
export interface IUnitOfWork {
  /** Register a new aggregate without writing to storage. / 登记新增聚合，不写入存储。 */
  registerNew<TEntity>(entity: TEntity): void;

  /** Register a changed aggregate without writing to storage. / 登记已修改聚合，不写入存储。 */
  registerDirty<TEntity>(entity: TEntity): void;

  /** Register an aggregate for deletion without writing to storage. / 登记待删除聚合，不写入存储。 */
  registerDeleted<TEntity>(entity: TEntity): void;

  /** Whether an explicitly opened transaction is active. / 是否存在显式开启的活动事务。 */
  readonly hasActiveTransaction: boolean;

  /** Explicitly begin a transaction; no transaction is opened by default. / 显式开启事务；默认不会开启事务。 */
  beginTransaction(): Promise<void>;

  /** Persist all registered changes and commit an explicitly opened transaction. / 持久化所有已登记变更，并提交显式开启的事务。 */
  commit(): Promise<void>;

  /** Discard registered changes and roll back an explicitly opened transaction. / 丢弃已登记变更，并回滚显式开启的事务。 */
  rollback(): Promise<void>;
}
