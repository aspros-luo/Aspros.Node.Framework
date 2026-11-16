# MikroORM Trade Persistence POC / MikroORM Trade 持久化技术验证

This isolated experiment evaluates MikroORM 7.2.9 against the existing Domain Trade aggregate. It is not a production adapter and is not part of the public Infrastructure API.

本独立实验使用 MikroORM 7.2.9 验证现有 Domain Trade 聚合。它不是生产适配器，也不属于公开 Infrastructure API。

## Current Scope / 当前范围

- Define independent relational persistence records for Trade, Order, and Refund. / 为 Trade、Order、Refund 定义独立的关系型持久化记录。
- Keep ORM metadata and dependencies outside Domain and the production Infrastructure package. / 将 ORM 元数据和依赖放在 Domain 与正式 Infrastructure package 之外。
- Explicitly map persistence records to Domain objects and back. / 显式实现持久化记录与领域对象的双向映射。
- Restore Order status through public domain behavior; do not assign private state. / 通过公开领域行为还原 Order 状态，不直接赋值私有状态。
- Start restored aggregates with no pending historical events. / 还原后的聚合不携带历史待处理事件。

## Object Boundaries / 对象边界

```text
MySQL rows
  -> MikroORM records (DO / persistence model)
  -> TradeMapper
  -> Domain Trade aggregate
```

API View Objects (VO) and application DTOs are business-application concerns. They do not belong in this persistence experiment.

API View Object（VO）和应用 DTO 属于业务应用边界，不属于本持久化实验。

## Commands / 命令

```bash
pnpm install
pnpm --filter @aspros/mikroorm-trade-poc typecheck
pnpm poc:trade-mapping
```

## Not Yet Implemented / 尚未实现

- MikroORM bootstrap and real MySQL connection tests. / MikroORM 启动配置和真实 MySQL 连接测试。
- Repository and Unit of Work adapters. / Repository 和 Unit of Work 适配器。
- Migration lifecycle and destructive-diff review. / Migration 生命周期和破坏性差异审查。
- Raw SQL sharing the active ORM transaction. / 与 ORM 事务共享上下文的原生 SQL。
- Runtime test evidence. / 真实运行测试证据。

Do not run schema creation or migration commands against a production database. The next database spike must use a dedicated disposable MySQL database.

不得对生产数据库运行 Schema 创建或 Migration 命令。下一阶段数据库实验必须使用专门的一次性 MySQL 数据库。
