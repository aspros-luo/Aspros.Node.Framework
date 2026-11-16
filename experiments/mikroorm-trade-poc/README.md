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
