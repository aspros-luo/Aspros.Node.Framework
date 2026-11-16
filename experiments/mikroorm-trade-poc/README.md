# MikroORM Trade Persistence POC / MikroORM Trade 持久化技术验证

This isolated experiment evaluates MikroORM 7.2.9 against the existing Domain Trade aggregate. It is not a production adapter and is not part of the public Infrastructure API.

本独立实验使用 MikroORM 7.2.9 验证现有 Domain Trade 聚合。它不是生产适配器，也不属于公开 Infrastructure API。

## Current Scope / 当前范围

- Independent Trade/Order/Refund persistence records. / 独立的 Trade/Order/Refund 持久化记录。
- Explicit bidirectional mapping between persistence records and Domain. / 持久化记录与 Domain 之间的显式双向映射。
- MikroORM bootstrap with caller-supplied MySQL URL. / 使用调用方提供的 MySQL URL 启动 MikroORM。
- An opt-in integration test that writes records and reloads them through a fresh EntityManager. / 可选的集成测试：写入记录后通过全新的 EntityManager 重新加载。
- A Trade Repository adapter and an explicit top-level Unit of Work scope. / Trade Repository 适配器和显式顶层 Unit of Work Scope。
- No automatic schema creation, update, drop, or migration. / 不自动创建、更新、删除或迁移 Schema。

## Object Boundaries / 对象边界

```text
MySQL rows
  -> MikroORM records (DO / persistence model)
  -> TradeMapper
  -> Domain Trade aggregate
```

API View Objects (VO) and application DTOs are business-application concerns. They do not belong in this persistence experiment.

API View Object（VO）和应用 DTO 属于业务应用边界，不属于本持久化实验。

## Mapping Tests / 映射测试

```bash
pnpm install
pnpm --filter @aspros/mikroorm-trade-poc typecheck
pnpm poc:trade-mapping
```

## Optional MySQL Integration / 可选 MySQL 集成验证

Use the dedicated database named `aspros_trade_poc` on a disposable MySQL instance. The bootstrap rejects every other database name. Never point this experiment at production or a database containing valuable data.

必须在一次性 MySQL 实例中使用名为 `aspros_trade_poc` 的专用数据库。启动入口会拒绝其他数据库名称。绝不可将本实验指向生产环境或包含重要数据的数据库。

Create the database explicitly, then apply the idempotent schema script:

先显式创建数据库，再执行可重复运行的 Schema 脚本：

```bash
mysql -h 127.0.0.1 -u <user> -p -e "CREATE DATABASE IF NOT EXISTS aspros_trade_poc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h 127.0.0.1 -u <user> -p aspros_trade_poc < experiments/mikroorm-trade-poc/src/schema.mysql.sql
```

Set a connection URL for that database and run the integration test:

设置指向该数据库的连接 URL，然后运行集成测试：

```bash
MYSQL_POC_DATABASE_URL='mysql://<user>:<password>@127.0.0.1:3306/aspros_trade_poc' pnpm poc:trade-mysql
```

When `MYSQL_POC_DATABASE_URL` is absent, the integration suite is skipped; ordinary mapper tests remain runnable. The integration test creates random IDs and deletes only the rows it created.

未设置 `MYSQL_POC_DATABASE_URL` 时，集成测试会跳过；普通 Mapper 测试仍可运行。集成测试使用随机 ID，并且只删除自身创建的记录。

## Not Yet Implemented / 尚未实现

- Generic, provider-independent Repository and Unit of Work adapters. The current adapters are Trade-specific POC implementations. / 通用、独立于 Provider 的 Repository 和 Unit of Work 适配器。目前实现仅是 Trade 专用 POC。
- Explicit transaction propagation and raw SQL sharing. / 显式事务传播和原生 SQL 共享。
- Versioned production migrations. / 生产环境版本化 Migration。
- Runtime test evidence from the project owner's local MySQL environment. / 项目所有者本地 MySQL 环境的实际运行证据。

Schema DDL is intentionally supplied as a small, reviewable POC script. It is not a production migration strategy.

Schema DDL 刻意以小型、可审查的 POC 脚本提供，不代表生产 Migration 策略。


## Repository and Unit of Work POC / Repository 与 Unit of Work 验证

The POC now includes `MikroOrmTradeRepository` and `MikroOrmTradeUnitOfWork`. Create a scope from the root EntityManager; the scope forks a fresh identity map, begins one top-level transaction, and exposes a repository sharing that manager.

POC 现已包含 `MikroOrmTradeRepository` 和 `MikroOrmTradeUnitOfWork`。从 Root EntityManager 创建 Scope；Scope 会 Fork 一个全新的 Identity Map，开启一个顶层事务，并提供共享该管理器的 Repository。

```ts
const scope = await createTradePersistenceScope(orm.em);
try {
  const trade = await scope.tradeRepository.findById(tradeId);
  // Apply domain behavior, then stage aggregate changes.
  if (trade) await scope.tradeRepository.save(trade);
  await scope.unitOfWork.commit();
} catch (error) {
  try { await scope.unitOfWork.rollback(); } catch { /* already closed */ }
  throw error;
}
```

The current scope owns its transaction and rejects a root EntityManager that is already in a transaction. REQUIRED/join-existing propagation is intentionally deferred. Repository `save` only stages changes; it never flushes or commits. It loads existing children, rejects omitted persisted children instead of silently deleting them, and rejects child-ID collisions across aggregates.

当前 Scope 自己拥有事务，并拒绝传入已处于事务中的 Root EntityManager。REQUIRED/加入现有事务的传播语义暂缓实现。Repository 的 `save` 只暂存变更，不执行 Flush 或 Commit。它会加载已有子记录；若聚合快照遗漏已持久化子记录则明确报错，不会静默删除；也会拒绝跨聚合的子实体 ID 冲突。

After a failed commit or rollback, the scope is unusable and its identity map is cleared. The caller must create a new scope and reload the aggregate; in-memory Domain objects are not rewound by database rollback. Domain events are not automatically cleared or published by this POC adapter.

Commit 或 Rollback 失败后，Scope 不可继续使用，Identity Map 会被清空。调用方必须创建新 Scope 并重新加载聚合；数据库回滚不会回滚内存中的 Domain 对象。此 POC 适配器不会自动清空或发布领域事件。


## Same-Transaction SQL / 同事务原生 SQL

MikroORM 7.2 provides a first-class Kysely integration through `EntityManager.getKysely()`. When called on the EntityManager that owns an active transaction, Kysely queries use that transaction context. The integration test explicitly flushes the ORM changes, writes a test-only audit row through Kysely, then rolls back and verifies that neither write remains.

MikroORM 7.2 通过 `EntityManager.getKysely()` 提供一等 Kysely 集成。在拥有活动事务的 EntityManager 上调用时，Kysely 查询会使用同一个事务上下文。集成测试会先 Flush ORM 变更，再通过 Kysely 写入仅供测试的审计记录，随后回滚并验证两类写入都不存在。

This is the current candidate for Dapper-like SQL access in the Node stack; it is not yet a published framework-level SQL executor abstraction. The behavior still requires execution against the local disposable MySQL database.

这是当前 Node 技术栈中对应 Dapper 类 SQL 访问的候选方案；它尚不是已发布的框架级 SQL Executor 抽象。该行为仍需在本地一次性 MySQL 数据库中实际执行验证。


## Transaction, Migration and Runtime Boundaries / 事务、迁移与运行时边界

### Transaction propagation / 事务传播

The current `TradePersistenceScope` is an explicitly owned top-level transaction. It maps to the root of a REQUIRED operation; it does not yet provide nested propagation. Do not create a second scope for a method that is meant to join the caller's transaction.

当前 `TradePersistenceScope` 是一个显式拥有顶层事务的 Scope，对应 REQUIRED 操作的事务根节点；它尚未提供嵌套传播。若某个方法应加入调用方事务，不要为它再创建第二个 Scope。

The framework-level policy is:

- `REQUIRED`: default business transaction. One outer scope owns the transaction; inner services reuse the same Unit of Work/EntityManager. Only the owner commits or rolls back. / `REQUIRED`：业务事务默认策略。由一个外层 Scope 拥有事务；内层服务复用同一个 Unit of Work/EntityManager。只有事务所有者可以提交或回滚。
- `NESTED`: savepoint on the same connection. This is an advanced opt-in and must be tested for EntityManager identity-map behavior and Domain object state after rollback. / `NESTED`：在同一连接上创建 Savepoint。属于高级可选能力，必须验证 EntityManager Identity Map 行为及回滚后 Domain 对象状态。
- `REQUIRES_NEW`: independent transaction and connection while the outer transaction is suspended. Use sparingly; pool exhaustion and lock contention are possible when outer transactions hold connections. / `REQUIRES_NEW`：挂起外层事务期间，使用独立事务和连接。应谨慎使用；外层事务持有连接时可能导致连接池耗尽或锁竞争。
- `SUPPORTS`, `NOT_SUPPORTED`, and `NEVER` are not part of the first framework contract. `MANDATORY` may be represented as an assertion that an active Unit of Work exists, rather than a separate transaction implementation. / 首版框架契约不包含 `SUPPORTS`、`NOT_SUPPORTED` 和 `NEVER`。`MANDATORY` 可以表示为“必须存在活动 Unit of Work”的断言，而不必另造事务实现。

The Domain `IUnitOfWork` remains persistence-neutral and exposes only `commit/rollback`. Transaction propagation belongs to an outer application orchestration contract (to be designed when Application is started) and its Infrastructure adapter; it must not leak MikroORM types into Domain. The current POC intentionally implements only the top-level owner. Nested and independent scopes are deferred until dedicated tests can verify their semantics.

Domain 的 `IUnitOfWork` 继续保持持久化技术无关，只暴露 `commit/rollback`。事务传播属于外层应用编排契约（待 Application 阶段设计）及其 Infrastructure 适配器，不应把 MikroORM 类型泄漏到 Domain。当前 POC 只实现顶层事务所有者；嵌套和独立事务 Scope 暂缓，直到有专门测试验证其语义。

### Migration policy / Migration 策略

- Migration is a release/deployment operation, never an implicit side effect of application startup. / Migration 是发布/部署操作，绝不是应用启动时的隐式副作用。
- Generate schema diffs in development, commit versioned migration files/snapshots, review the SQL and data impact, then execute through a dedicated deployment step with a least-privilege migration credential. / 在开发环境生成 Schema 差异，提交版本化 Migration 文件和快照，审查 SQL 与数据影响，再通过独立部署步骤执行，并使用最小权限的 Migration 凭据。
- Keep schema changes separate from application startup and normal request credentials. / Schema 变更与应用启动、普通请求使用的数据库凭据分离。
- For MySQL, do not assume a migration containing DDL is transactionally reversible: statements such as `CREATE TABLE`, `ALTER TABLE`, and `CREATE INDEX` implicitly commit the active transaction. Use expand/contract changes, explicit backfill steps, backups and forward-recovery plans. / 对 MySQL，不能假设包含 DDL 的 Migration 可以通过事务整体回滚：`CREATE TABLE`、`ALTER TABLE` 和 `CREATE INDEX` 等语句会隐式提交当前事务。应采用 Expand/Contract 变更、明确的数据回填步骤、备份和向前修复方案。
- MikroORM Schema Generator is development tooling, not a production schema migration mechanism. Generated SQL must be reviewed; never run `schema:update` or `schema:fresh` against production. / MikroORM Schema Generator 是开发工具，不是生产 Schema 迁移机制。生成 SQL 必须审查；绝不可在生产环境运行 `schema:update` 或 `schema:fresh`。
- Migration execution must be observable and serialized per database/schema. Do not run the same migration set concurrently from every application replica. / Migration 执行必须可观测，并按数据库/Schema 串行化。不要让每个应用副本并发执行同一套 Migration。

The POC's hand-reviewed `schema.mysql.sql` remains a disposable-database bootstrap only. It is not the future production migration history.

POC 中人工审查的 `schema.mysql.sql` 只用于一次性实验数据库初始化，不是未来生产环境的 Migration 历史。

### ORM and connection lifecycle / ORM 与连接生命周期

- Initialize one MikroORM instance per process/database configuration during application bootstrap. It owns the pool and metadata. / 每个进程/数据库配置在应用启动时初始化一个 MikroORM 实例，由它拥有连接池和元数据。
- Fork an EntityManager/identity map per request or background job. Never share one mutable EntityManager across concurrent requests/jobs. / 每个请求或后台任务 Fork 独立 EntityManager/Identity Map。绝不在并发请求/任务之间共享同一个可变 EntityManager。
- A Unit of Work scope owns its forked context and transaction, but does not own or close the process-wide connection pool. / Unit of Work Scope 拥有自己的 Fork 上下文和事务，但不拥有也不关闭进程级连接池。
- On graceful shutdown: stop accepting new work, drain active requests/jobs, ensure active transactions are committed or rolled back, then close the ORM/pool once. Forced close is an emergency path, not routine request cleanup. / 优雅关闭时：停止接收新任务，等待活动请求/后台任务排空，确保活动事务已提交或回滚，然后统一关闭 ORM/连接池。强制关闭只用于紧急情况，不是每次请求清理的常规方式。
- Readiness checks may use the ORM connection health API; liveness should not fail solely because a transient database connection check failed. Retry whole operations only when idempotency and error classification make that safe, using a fresh EntityManager after a failed transaction. / Readiness 检查可以使用 ORM 连接健康 API；Liveness 不应仅因瞬时数据库连接检查失败而判定进程死亡。只有在幂等性和错误分类允许时才重试整个操作，并在事务失败后使用新的 EntityManager。

These lifecycle rules are Node Infrastructure concerns. The Domain package remains free of Node APIs and connection/ORM types.

这些生命周期规则属于 Node Infrastructure。Domain package 继续不依赖 Node API、连接类型或 ORM 类型。
