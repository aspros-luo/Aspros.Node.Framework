# MikroORM Trade Persistence POC / MikroORM Trade 持久化技术验证

This isolated experiment evaluates MikroORM 7.2.9 against the existing Domain Trade aggregate. It is not a production adapter and is not part of the public Infrastructure API.

本独立实验使用 MikroORM 7.2.9 验证现有 Domain Trade 聚合。它不是生产适配器，也不属于公开 Infrastructure API。

## Current Scope / 当前范围

- Independent Trade/Order/Refund persistence records. / 独立的 Trade/Order/Refund 持久化记录。
- Explicit bidirectional mapping between persistence records and Domain. / 持久化记录与 Domain 之间的显式双向映射。
- MikroORM bootstrap with caller-supplied MySQL URL. / 使用调用方提供的 MySQL URL 启动 MikroORM。
- An opt-in integration test that writes records and reloads them through a fresh EntityManager. / 可选的集成测试：写入记录后通过全新的 EntityManager 重新加载。
- A query-only Trade Repository adapter and a Register/Commit Unit of Work scope with opt-in transactions. / 只读 Trade Repository 适配器，以及采用 Register/Commit 语义、事务可选开启的 Unit of Work Scope。
- No schema changes occur during ordinary ORM bootstrap. Schema changes are applied only through the dedicated, explicit versioned migration command. / 普通 ORM 启动过程不会修改 Schema；只有通过独立、显式的版本化 Migration 命令才会应用 Schema 变更。

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

Create the dedicated database explicitly. Database/server provisioning is an operator or deployment responsibility; this framework experiment never creates a database. The migration runner creates only the POC tables and its migration-history table inside the already existing database.

必须先由操作者或部署流程显式创建专用数据库。数据库实例和 Database 本身的创建属于运维/部署职责；本框架实验绝不创建 Database。Migration Runner 只会在已经存在的数据库内部创建 POC 数据表和迁移历史表：

```bash
mysql -h 127.0.0.1 -u <user> -p -e "CREATE DATABASE IF NOT EXISTS aspros_trade_poc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
export MYSQL_POC_DATABASE_URL='mysql://<user>:<password>@127.0.0.1:3306/aspros_trade_poc'
pnpm poc:trade-migrate
pnpm poc:trade-migration-status
pnpm poc:trade-mysql
```

Migration execution is a separate explicit command. Ordinary `createTradePocOrm()` does not register the Migrator extension and never applies migrations. The runner accepts only the exact `aspros_trade_poc` database and exposes only `up` and `status`; there is deliberately no CLI rollback/fresh command. The `status` command reads `information_schema` and the history table directly without initializing Migrator or creating the history table.

Migration 执行是独立的显式命令。普通 `createTradePocOrm()` 不注册 Migrator 扩展，也绝不执行 Migration。Runner 只接受名称严格匹配的 `aspros_trade_poc` 数据库，只开放 `up` 和 `status`；刻意不提供 CLI 回滚或重建命令。`status` 直接读取 `information_schema` 和历史表，不初始化 Migrator，也不会创建历史表。

**Failure recovery / 失败恢复：** MySQL DDL may be committed statement by statement. Each registered migration declares the table names it is responsible for as recovery-scope metadata; the Migration class remains the only DDL source of truth. Before applying pending migrations, the runner checks each migration only against its own target tables. Existing tables owned by earlier, successfully applied migrations do not block a later migration. If a pending migration's own target table already exists without a matching history entry, the runner refuses automatic rerun. Inspect the real DDL and history first; on this disposable POC database, either repair forward deliberately or reset only the POC schema before retrying. The guard detects table-name residue, not column/index/constraint drift.

**失败恢复：** MySQL DDL 可能逐条语句提交。每个已注册 Migration 都声明自己负责的表名，作为失败恢复范围元数据；Migration 类仍然是唯一 DDL 来源。执行待处理 Migration 前，Runner 只检查该 Migration 自己负责的目标表。之前已成功执行的 Migration 所创建的表，不会阻止后续 Migration 执行。如果某个待执行 Migration 自己负责的表已经存在、但没有对应的执行历史，Runner 就拒绝自动重跑。必须先检查真实 DDL 和历史记录；对于这个一次性 POC 数据库，应明确选择向前修复，或仅重置 POC Schema 后再重试。该保护只检测表名残留，不检测列、索引或约束漂移。

The status output distinguishes `not-applied`, `pending`, `partially-created-or-unlogged`, `applied`, and `inconsistent`. A normal later migration waiting to run is reported as `pending`; `inconsistent` means a table owned by an executed migration is missing. These states are based on migration-history rows and declared target table names only; they do not prove that column definitions, indexes, foreign keys, or data are correct. Migration execution writes structured JSON lifecycle events to stdout/stderr, including start, completion duration, and failure details.

Status 输出区分 `not-applied`、`partially-created-or-unlogged`、`applied` 和 `inconsistent`。这些状态只根据 Migration 历史记录和预期表名判断；不能证明列定义、索引、外键或数据正确。Migration 执行会向 stdout/stderr 输出结构化 JSON 生命周期事件，包括开始、完成耗时和失败详情。

**Concurrency boundary / 并发边界：** Do not run `poc:trade-migrate` concurrently from multiple terminals, CI jobs, or deployment replicas. This POC runner does not acquire a distributed/database migration lock. Its caller must serialize execution. Production orchestration must provide a database/schema-scoped deployment mutex before invoking a migration process.

**并发边界：** 不要从多个终端、CI Job 或部署副本并发运行 `poc:trade-migrate`。当前 POC Runner 不获取分布式锁或数据库 Migration 锁，调用方必须保证串行执行。生产部署编排必须在启动 Migration 进程前，提供按数据库/Schema 作用域隔离的部署互斥锁。

When `MYSQL_POC_DATABASE_URL` is absent, the integration suite is skipped; ordinary mapper tests remain runnable. The integration test creates random IDs and deletes only the rows it created.

未设置 `MYSQL_POC_DATABASE_URL` 时，集成测试会跳过；普通 Mapper 测试仍可运行。集成测试使用随机 ID，并且只删除自身创建的记录。

## Not Yet Implemented / 尚未实现

- Generic, provider-independent Repository and Unit of Work adapters. The current adapters are Trade-specific POC implementations. / 通用、独立于 Provider 的 Repository 和 Unit of Work 适配器。目前实现仅是 Trade 专用 POC。
- Explicit transaction propagation and raw SQL sharing. / 显式事务传播和原生 SQL 共享。
- Production deployment orchestration and cross-process migration locking. The POC runner is intended for one explicitly serialized operator/deployment process only. / 生产部署编排和跨进程 Migration 互斥。当前 POC Runner 仅供单个、明确串行化的操作者/部署进程使用。
- Runtime test evidence from the project owner's local MySQL environment. / 项目所有者本地 MySQL 环境的实际运行证据。

The POC migration is an isolated schema proof, not an approved production migration strategy. MySQL DDL is not transactionally reversible; a failed multi-statement migration may leave earlier DDL applied. A successful `CREATE TABLE IF NOT EXISTS` only confirms that a table name exists; it does not validate the table's columns, indexes, or constraints.

POC Migration 只是独立 Schema 验证，并非已批准的生产 Migration 策略。MySQL DDL 不具备事务性可逆保证；多语句 Migration 失败时，之前执行的 DDL 可能已经生效。成功执行 `CREATE TABLE IF NOT EXISTS` 只能确认表名存在，并不验证表的列、索引或约束是否正确。


## Repository and Unit of Work POC / Repository 与 Unit of Work 验证

The Repository is query-only. It restores complete Domain aggregates but does not expose save/add/update/delete methods. Persistence changes are explicitly registered with the Unit of Work.

Repository 只负责查询。它还原完整 Domain 聚合，但不提供 save/add/update/delete 方法。持久化变更通过 Unit of Work 显式登记。

```ts
const scope = await createTradePersistenceScope(orm.em); // no transaction is opened
const trade = await scope.tradeRepository.findById(tradeId);
if (trade) {
  trade.confirmOrder(orderId);
  scope.unitOfWork.registerDirty(trade);
}
await scope.unitOfWork.commit(); // the only persistence/save boundary
```

- `registerNew`, `registerDirty`, and `registerDeleted` only record intent in memory; they do not issue database writes. / `registerNew`、`registerDirty` 和 `registerDeleted` 只在内存中登记意图，不执行数据库写入。
- `commit` maps registered aggregates to persistence records and flushes them. / `commit` 将已登记聚合映射为持久化记录并执行 Flush。
- Transactions are disabled by default. Call `beginTransaction()` when several operations must share an explicit transaction; the same Unit of Work owns its commit/rollback. / 事务默认关闭。多个操作需要共享显式事务时调用 `beginTransaction()`；同一个 Unit of Work 负责提交或回滚。
- Without an explicit transaction, MikroORM may still use its own short transaction for one `flush()`. This does not create a transaction spanning multiple business operations. / 未显式开启事务时，MikroORM 仍可能为单次 `flush()` 使用内部短事务；这不等于跨多个业务操作的显式事务。
- A failed commit makes the scope unusable. Create a new scope and reload aggregates; database rollback cannot rewind in-memory Domain objects. / Commit 失败后 Scope 不可复用。应创建新 Scope 并重新加载聚合；数据库回滚无法还原内存中的 Domain 对象。

## Same-Transaction SQL / 同事务原生 SQL

MikroORM 7.2 provides a first-class Kysely integration through `EntityManager.getKysely()`. When called on the EntityManager that owns an active transaction, Kysely queries use that transaction context. The integration test opens an explicit transaction, registers a new aggregate without committing it, writes a test-only audit row through Kysely, then rolls back and verifies the audit row is absent and the registered aggregate was never persisted.

MikroORM 7.2 通过 `EntityManager.getKysely()` 提供一等 Kysely 集成。在拥有活动事务的 EntityManager 上调用时，Kysely 查询会使用同一个事务上下文。集成测试会显式开启事务，登记一个尚未 Commit 的新聚合，再通过 Kysely 写入仅供测试的审计记录，随后回滚并验证审计记录不存在，且登记的聚合从未被持久化。

This is the current candidate for Dapper-like SQL access in the Node stack; it is not yet a published framework-level SQL executor abstraction. The behavior still requires execution against the local disposable MySQL database.

这是当前 Node 技术栈中对应 Dapper 类 SQL 访问的候选方案；它尚不是已发布的框架级 SQL Executor 抽象。该行为仍需在本地一次性 MySQL 数据库中实际执行验证。


## Transaction, Migration and Runtime Boundaries / 事务、迁移与运行时边界

### Transaction propagation / 事务传播

The current `TradePersistenceScope` forks an isolated EntityManager without opening a transaction. Calling `beginTransaction()` explicitly creates the top-level transaction; nested propagation is not yet provided. Do not create a second scope for a method that is meant to join the caller's transaction.

当前 `TradePersistenceScope` Fork 隔离的 EntityManager，但不会自动开启事务。显式调用 `beginTransaction()` 才会创建顶层事务；目前尚未提供嵌套传播。若某个方法应加入调用方事务，不要为它再创建第二个 Scope。

The framework-level policy is:

- `REQUIRED`: opt-in transaction policy for operations that explicitly require a transaction. One outer scope owns the transaction; inner services reuse the same Unit of Work/EntityManager. Only the owner commits or rolls back. / `REQUIRED`：仅供明确要求事务的操作选择使用。由一个外层 Scope 拥有事务；内层服务复用同一个 Unit of Work/EntityManager。只有事务所有者可以提交或回滚。
- `NESTED`: savepoint on the same connection. This is an advanced opt-in and must be tested for EntityManager identity-map behavior and Domain object state after rollback. / `NESTED`：在同一连接上创建 Savepoint。属于高级可选能力，必须验证 EntityManager Identity Map 行为及回滚后 Domain 对象状态。
- `REQUIRES_NEW`: independent transaction and connection while the outer transaction is suspended. Use sparingly; pool exhaustion and lock contention are possible when outer transactions hold connections. / `REQUIRES_NEW`：挂起外层事务期间，使用独立事务和连接。应谨慎使用；外层事务持有连接时可能导致连接池耗尽或锁竞争。
- `SUPPORTS`, `NOT_SUPPORTED`, and `NEVER` are not part of the first framework contract. `MANDATORY` may be represented as an assertion that an active Unit of Work exists, rather than a separate transaction implementation. / 首版框架契约不包含 `SUPPORTS`、`NOT_SUPPORTED` 和 `NEVER`。`MANDATORY` 可以表示为“必须存在活动 Unit of Work”的断言，而不必另造事务实现。

The Domain `IUnitOfWork` remains persistence-neutral: it exposes registration, `beginTransaction`, `commit`, `rollback`, and an active-transaction indicator. Registration is in-memory only; `commit` is the actual save boundary. Transactions are opt-in. Transaction propagation beyond one explicitly owned scope remains deferred until dedicated tests can verify its semantics.

Domain 的 `IUnitOfWork` 继续保持持久化技术无关：暴露变更登记、`beginTransaction`、`commit`、`rollback` 和活动事务状态。登记只在内存中进行；`commit` 才是真正的保存边界。事务默认关闭。超出单一显式事务 Scope 的传播语义仍暂缓，直到有专门测试验证。

### Migration policy / Migration 策略

- Migration is a release/deployment operation, never an implicit side effect of application startup. / Migration 是发布/部署操作，绝不是应用启动时的隐式副作用。
- Generate schema diffs in development, commit versioned migration files/snapshots, review the SQL and data impact, then execute through a dedicated deployment step with a least-privilege migration credential. / 在开发环境生成 Schema 差异，提交版本化 Migration 文件和快照，审查 SQL 与数据影响，再通过独立部署步骤执行，并使用最小权限的 Migration 凭据。
- Keep schema changes separate from application startup and normal request credentials. / Schema 变更与应用启动、普通请求使用的数据库凭据分离。
- For MySQL, do not assume a migration containing DDL is transactionally reversible: statements such as `CREATE TABLE`, `ALTER TABLE`, and `CREATE INDEX` implicitly commit the active transaction. Use expand/contract changes, explicit backfill steps, backups and forward-recovery plans. / 对 MySQL，不能假设包含 DDL 的 Migration 可以通过事务整体回滚：`CREATE TABLE`、`ALTER TABLE` 和 `CREATE INDEX` 等语句会隐式提交当前事务。应采用 Expand/Contract 变更、明确的数据回填步骤、备份和向前修复方案。
- MikroORM Schema Generator is development tooling, not a production schema migration mechanism. Generated SQL must be reviewed; never run `schema:update` or `schema:fresh` against production. / MikroORM Schema Generator 是开发工具，不是生产 Schema 迁移机制。生成 SQL 必须审查；绝不可在生产环境运行 `schema:update` 或 `schema:fresh`。
- Migration execution must be observable and serialized per database/schema. Do not run the same migration set concurrently from every application replica. / Migration 执行必须可观测，并按数据库/Schema 串行化。不要让每个应用副本并发执行同一套 Migration。

The versioned `Migration20261117000100_CreateTradePocSchema` class is the single source of truth for the disposable POC schema. The old hand-applied SQL file was removed to avoid duplicate schema definitions.

版本化的 `Migration20261117000100_CreateTradePocSchema` 类是一次性 POC Schema 的唯一事实来源。旧的手工 SQL 文件已删除，以避免重复维护 Schema 定义。

### ORM and connection lifecycle / ORM 与连接生命周期

- Initialize one MikroORM instance per process/database configuration during application bootstrap. It owns the pool and metadata. / 每个进程/数据库配置在应用启动时初始化一个 MikroORM 实例，由它拥有连接池和元数据。
- Fork an EntityManager/identity map per request or background job. Never share one mutable EntityManager across concurrent requests/jobs. / 每个请求或后台任务 Fork 独立 EntityManager/Identity Map。绝不在并发请求/任务之间共享同一个可变 EntityManager。
- A Unit of Work scope owns its forked context and any transaction it explicitly opens, but does not own or close the process-wide connection pool. / Unit of Work Scope 拥有自己的 Fork 上下文以及显式开启的事务，但不拥有也不关闭进程级连接池。
- On graceful shutdown: stop accepting new work, drain active requests/jobs, ensure active transactions are committed or rolled back, then close the ORM/pool once. Forced close is an emergency path, not routine request cleanup. / 优雅关闭时：停止接收新任务，等待活动请求/后台任务排空，确保活动事务已提交或回滚，然后统一关闭 ORM/连接池。强制关闭只用于紧急情况，不是每次请求清理的常规方式。
- Readiness checks may use the ORM connection health API; liveness should not fail solely because a transient database connection check failed. Retry whole operations only when idempotency and error classification make that safe, using a fresh EntityManager after a failed transaction. / Readiness 检查可以使用 ORM 连接健康 API；Liveness 不应仅因瞬时数据库连接检查失败而判定进程死亡。只有在幂等性和错误分类允许时才重试整个操作，并在事务失败后使用新的 EntityManager。

These lifecycle rules are Node Infrastructure concerns. The Domain package remains free of Node APIs and connection/ORM types.

这些生命周期规则属于 Node Infrastructure。Domain package 继续不依赖 Node API、连接类型或 ORM 类型。
