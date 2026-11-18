# Infrastructure Design / Infrastructure 设计

**Status / 状态：.NET persistence audit complete; MikroORM/MySQL proof of concept pending / .NET 持久化审计已完成；MikroORM/MySQL POC 待验证**

This document is the single source of truth for Infrastructure scope, capability mapping, and provider decisions. It is a design baseline, not a claim that listed capabilities are implemented.

本文档是 Infrastructure 范围、能力映射和技术选型的唯一事实来源。它是设计基线，不代表所列能力已经实现。

## 1. Goals and Non-goals / 目标与非目标

Infrastructure implements technical integrations required by the framework while keeping domain rules independent from providers and runtime details.

Infrastructure 负责实现框架所需的技术集成，同时让领域规则独立于具体供应商和运行时细节。

Goals / 目标：

- Implement Domain Repository and Unit of Work contracts with real persistence adapters. / 使用真实持久化适配器实现 Domain Repository 和 Unit of Work 契约。
- Provide reusable adapters for databases, cache, messaging, analytics, service communication, and operations. / 为数据库、缓存、消息、分析存储、服务通信和运维能力提供可复用适配器。
- Keep provider-specific dependencies at adapter boundaries. / 将供应商专属依赖限制在适配器边界内。
- Make lifecycle, configuration, failure handling, and observability explicit. / 明确生命周期、配置、故障处理和可观测性。
- Require focused tests and usage examples for public abstractions. / 公共抽象必须配套针对性测试和使用示例。

Non-goals / 非目标：

- Owning business rules or aggregate invariants. / 不负责业务规则或聚合不变量。
- Depending on Application or defining application use cases. / 不依赖 Application，也不定义应用用例。
- Exposing one giant interface that mirrors every vendor SDK. / 不提供一个映射所有供应商 SDK 的庞大接口。
- Claiming a provider is supported before its adapter and integration tests exist. / 在适配器和集成测试完成前，不宣称支持某个供应商。
- Building the formal microservice demo during package initialization. / 初始化 package 阶段不构建正式微服务 Demo。

## 2. Reference .NET Framework Mapping / 原 .NET 框架能力映射

The reference framework is a source of proven requirements and behavior, not a mandate to copy .NET APIs into TypeScript.

参考 .NET 框架用于提取已经验证过的需求和行为，不意味着将 .NET API 机械复制到 TypeScript。

| Reference capability / .NET 能力 | Node framework responsibility / Node 框架职责 | Initial decision / 当前决策 |
|---|---|---|
| EF Core | Relational persistence, mapping, migrations, and aggregate repository adapters. / 关系型持久化、映射、迁移和聚合仓储适配器。 | Select a Node ORM/query-builder only after evaluating transaction and migration behavior. / 评估事务与迁移能力后再选择 Node ORM/Query Builder。 |
| Dapper / IDapperExecutor | Explicit SQL execution for complex queries, reports, and performance-sensitive reads. / 为复杂查询、报表和性能敏感读取提供显式 SQL 执行能力。 | Design a small executor that can share the active database transaction; do not duplicate ORM features. / 设计可复用当前数据库事务的精简执行器，不重复实现 ORM 功能。 |
| UnitOfWork | Coordinate persistence operations and explicit transaction boundaries. / 协调持久化操作和显式事务边界。 | Implement Domain IUnitOfWork with explicit register/commit semantics; transactions are opt-in. / 实现具备显式 Register/Commit 语义的 Domain IUnitOfWork；事务默认关闭。 |
| In-process IEvent / IEventHandler | Optional process-local event dispatch. / 可选的进程内事件分发。 | Keep separate from durable broker delivery; document failure and ordering semantics. / 与持久化消息投递分离，并明确失败与顺序语义。 |
| CAP / MassTransit / MQ | Durable cross-process messaging, retries, acknowledgements, and eventual consistency. / 跨进程可靠消息、重试、确认和最终一致性。 | Evaluate Node broker libraries and Outbox/Inbox support before selecting providers. / 选型前评估 Node 消息库及 Outbox/Inbox 支持。 |
| Redis / HybridCache-like behavior | Cache, optional multi-level cache, and distributed coordination where justified. / 缓存、可选多级缓存，以及有充分理由时的分布式协调。 | Define use-case-oriented contracts; do not expose Redis commands as the framework API. / 按使用场景定义契约，不把 Redis 命令直接暴露为框架 API。 |
| HTTP client resilience | Outbound HTTP client composition, timeout, retry, circuit breaking, and concurrency limits. / 出站 HTTP 客户端组合、超时、重试、熔断和并发限制。 | Prefer composable policies and standard Fetch/Undici-compatible integration; confirm runtime baseline first. / 优先采用可组合策略和兼容 Fetch/Undici 的集成，先确认运行时基线。 |
| ASP.NET Core Web API | Inbound HTTP hosting, middleware, rate limiting, and request lifecycle integration. / 入站 HTTP 宿主、中间件、限流和请求生命周期集成。 | Keep framework-neutral contracts separate from the selected Node HTTP host. / 将框架无关契约与选定的 Node HTTP 宿主分离。 |
| gRPC Server / ClientFactory | RPC server hosting and typed client registration. / RPC 服务端宿主和类型化客户端注册。 | Preserve service-owned proto/contracts; evaluate Node gRPC implementation and operational support. / 保留业务服务自行维护 proto/契约的方式，评估 Node gRPC 实现及运维支持。 |
| Nacos Service Discovery | Resolve healthy service instances and metadata. / 解析健康服务实例及其元数据。 | Provider is undecided; keep discovery behind a narrow capability contract if retained. / 供应商待定；如保留该能力，应置于精简契约之后。 |
| Permission Validation | Remote permission checks and fail-closed behavior. / 远程权限校验及故障关闭行为。 | Treat as an optional integration, not a mandatory core dependency. / 作为可选集成，不设为核心强制依赖。 |
| AutoInject / AddAsprosFramework | Explicit service registration and package composition. / 显式服务注册和 package 组合。 | Prefer explicit registration first; avoid hidden global scanning conventions. / 优先显式注册，避免隐式全局扫描约定。 |
| Logging / Health / Rate limiting | Structured logs, health probes, and operational controls. / 结构化日志、健康探针和运维控制。 | Define adapters around ecosystem standards; avoid binding the framework to one logger. / 围绕生态标准定义适配器，避免全框架绑定单一日志库。 |
| ClickHouse (additional target) | Analytical ingestion and read-oriented queries, separate from transactional aggregates. / 分析型写入和面向读取的查询，与事务聚合分离。 | Treat as analytics storage, not a normal aggregate Repository provider. / 作为分析存储，不作为普通聚合 Repository 的数据库供应商。 |

## 3. Capability Areas / 能力分区

These are logical capability boundaries, not a commitment to create one npm package per item.

以下是逻辑能力边界，不意味着每项能力都必须单独建立 npm package。

1. **Persistence / 持久化**
   - Relational database connection and pool lifecycle. / 关系型数据库连接与连接池生命周期。
   - ORM or query-builder mapping and migrations. / ORM 或 Query Builder 映射与迁移。
   - Domain Repository and Unit of Work adapters. / Domain Repository 和 Unit of Work 适配器。
   - Explicit transaction scopes and transaction propagation. / 显式事务范围与事务传递。
   - Raw SQL executor for cases where ORM abstraction is not appropriate. / ORM 抽象不适用场景下的原生 SQL 执行器。

2. **Cache and Coordination / 缓存与协调**
   - Cache get/set/remove, expiration, and serialization policy. / 缓存读取、写入、删除、过期和序列化策略。
   - Optional local and distributed cache composition. / 可选本地缓存与分布式缓存组合。
   - Distributed lock and idempotency primitives only where required. / 仅在确有需要时提供分布式锁和幂等基础能力。

3. **Messaging and Events / 消息与事件**
   - Process-local event dispatch, kept distinct from durable messaging. / 进程内事件分发，与可靠消息分离。
   - Broker producer/consumer lifecycle, acknowledgement, retry, and dead-letter handling. / 消息代理生产者/消费者生命周期、确认、重试和死信处理。
   - Outbox/Inbox foundations and idempotent consumption. / Outbox/Inbox 基础能力和幂等消费。
   - Explicit schema and message versioning policy. / 明确消息 Schema 和版本策略。

4. **Analytics / 分析存储**
   - ClickHouse client lifecycle and configuration. / ClickHouse 客户端生命周期和配置。
   - Batch ingestion and retry boundaries. / 批量写入和重试边界。
   - Analytics-specific read/write models, not aggregate persistence. / 分析专属读写模型，而非聚合持久化。

5. **Service Communication / 服务通信**
   - Outbound HTTP client and resilience. / 出站 HTTP 客户端和弹性策略。
   - Inbound HTTP host integration and middleware. / 入站 HTTP 宿主集成和中间件。
   - gRPC server/client support if selected. / 如选定则提供 gRPC 服务端/客户端支持。
   - Service discovery and endpoint selection if selected. / 如选定则提供服务发现和端点选择。

6. **Operations and Runtime Integration / 运维与运行时集成**
   - Structured logging, metrics, tracing, and correlation context. / 结构化日志、指标、链路追踪和关联上下文。
   - Health checks, readiness/liveness, and rate limiting integration. / 健康检查、就绪/存活探针和限流集成。
   - Configuration validation, registration, and lifecycle management. / 配置校验、注册和生命周期管理。
   - Node-specific APIs stay in Infrastructure adapters or runtime-node, according to ownership. / Node 专属 API 根据职责放在 Infrastructure 适配器或 runtime-node。

## 4. Package Boundary / Package 边界

The first implementation uses one workspace package, @aspros/infrastructure, with logical capability folders. Provider-specific packages may be extracted later when independent release, dependency isolation, or optional installation provides concrete value.

首轮使用一个工作区 package：@aspros/infrastructure，内部按能力划分逻辑目录。只有当独立发布、依赖隔离或可选安装确实产生价值时，才拆分供应商专属 package。

Proposed internal layout / 建议内部结构：

~~~text
packages/infrastructure/
├── src/
│   ├── database/
│   │   ├── contracts/
│   │   ├── transactions/
│   │   └── providers/
│   ├── cache/
│   │   ├── contracts/
│   │   └── providers/
│   ├── messaging/
│   │   ├── contracts/
│   │   ├── outbox/
│   │   ├── inbox/
│   │   └── providers/
│   ├── analytics/
│   │   └── clickhouse/
│   ├── communication/
│   │   ├── http/
│   │   ├── grpc/
│   │   └── discovery/
│   ├── observability/
│   ├── health/
│   ├── configuration/
│   └── index.ts
├── examples/
├── tests/
├── package.json
└── README.md
~~~

The layout is provisional. Folders and public contracts are added when a capability is designed, not pre-created as empty placeholders.

该结构是暂定方案。只有在某项能力进入设计时才创建相应目录和公共契约，不提前堆积空目录。

## 5. Dependency and Transaction Rules / 依赖与事务规则

- Infrastructure may import Domain contracts; Domain never imports Infrastructure. / Infrastructure 可以导入 Domain 契约；Domain 绝不导入 Infrastructure。
- Infrastructure must not import Application. / Infrastructure 不得导入 Application。
- Domain Repository and Unit of Work contracts remain provider-neutral. / Domain Repository 和 Unit of Work 契约保持供应商无关。
- Database transactions are owned by the database adapter and exposed through the Domain Unit of Work implementation where appropriate. / 数据库事务由数据库适配器管理，并在适当情况下通过 Domain Unit of Work 实现提供。
- Raw SQL execution must reuse the active transaction when participating in the same atomic operation. / 原生 SQL 执行参与同一原子操作时必须复用当前事务。
- Do not publish a durable message before the database transaction commits. / 数据库事务提交前不得发布可靠消息。
- A successful commit followed by a failed broker publish requires an Outbox-based recovery path when reliable delivery is promised. / 若承诺可靠投递，则事务成功但 Broker 发布失败时必须有 Outbox 恢复路径。
- ClickHouse ingestion is asynchronous and must not be confused with transactional aggregate persistence. / ClickHouse 写入应采用异步方式，不得与事务聚合持久化混淆。

## 6. Provider Decisions Still Open / 尚待确定的技术选型

No provider is selected by this initialization. Decisions require comparison based on ecosystem maturity, TypeScript support, transaction propagation, migration workflow, operational burden, testing, and long-term maintenance.

本次初始化不选定任何供应商。技术选型需要根据生态成熟度、TypeScript 支持、事务传递、迁移流程、运维成本、测试能力和长期维护情况进行比较。

- Relational database and default persistence provider. / 关系型数据库及默认持久化供应商。
- ORM/query-builder and migration tooling. / ORM/Query Builder 与迁移工具。
- Raw SQL executor and transaction sharing strategy. / 原生 SQL 执行器及事务共享策略。
- Redis client and cache serialization contract. / Redis 客户端与缓存序列化契约。
- Message broker(s), client libraries, and Outbox/Inbox strategy. / 消息代理、客户端库及 Outbox/Inbox 策略。
- ClickHouse client and ingestion strategy. / ClickHouse 客户端和数据写入策略。
- HTTP host, gRPC stack, and service discovery provider. / HTTP 宿主、gRPC 技术栈和服务发现供应商。
- Logging, metrics, tracing, and health-check integration. / 日志、指标、链路追踪和健康检查集成。
- Configuration and dependency registration conventions. / 配置与依赖注册约定。

## 7. Delivery and Acceptance / 建设与验收

Each capability follows this sequence:

每项能力均按以下顺序推进：

1. Audit the corresponding .NET implementation and identify behavior worth preserving. / 审计对应 .NET 实现，识别值得保留的行为。
2. Compare Node ecosystem options and record the decision with trade-offs. / 比较 Node 生态方案并记录决策与取舍。
3. Define the smallest useful contract and provider boundary. / 定义最小且有实际价值的契约与供应商边界。
4. Implement a real adapter; an interface or in-memory fake alone does not count. / 实现真实适配器；仅有接口或内存 Fake 不算实现。
5. Add unit and integration tests, including failure and lifecycle paths. / 增加单元测试和集成测试，覆盖失败及生命周期路径。
6. Add a bilingual usage example demonstrating contract registration and real adapter use. / 增加双语使用示例，展示契约注册和真实适配器使用。
7. Record actual verification evidence and update this document. / 记录真实验证证据并更新本文档。

## 8. Reference .NET Persistence Audit / 参考 .NET 持久化审计

**Scope / 范围：** Domain Repository, EF Core DbContext adapter, BaseRepository, UnitOfWork, DapperExecutor, DI registration, and migration guidance.

**审计对象：** Domain Repository、EF Core DbContext 适配器、BaseRepository、UnitOfWork、DapperExecutor、依赖注入注册及 Migration 指引。

| Area / 领域 | Verified .NET behavior / 已核实行为 | Assessment for Node / Node 版评估 |
|---|---|---|
| DbContext | Each business service owns its concrete DbContext. `AddAsprosDbContext<T>` maps the same scoped instance to `IDbContext` and `IEntitySetProvider`. / 具体 DbContext 由业务服务拥有；便捷注册将同一 Scoped 实例映射为两个接口。 | Preserve business-owned mapping and provider configuration. / 保留业务服务拥有映射和 Provider 配置的边界。 |
| EF adapter | `IDbContext` exposes EF `DbSet`, `EntityEntry`, `ChangeTracker`, transaction and connection types. / `IDbContext` 暴露 EF 的集合、跟踪器、事务和连接类型。 | These belong in Infrastructure, not portable Domain contracts. / 这些类型属于 Infrastructure，不应进入可移植的 Domain 契约。 |
| BaseRepository | Exposes `IQueryable` and expression-tree predicates; delegates updates to EF `Update`; applies soft delete for `ISoftDelete`. / 暴露 `IQueryable` 和表达式树；更新委托给 EF；对 `ISoftDelete` 执行软删除。 | Do not copy ORM query types into Node Domain. Review graph updates and soft-delete policy independently. / 不将 ORM 查询类型复制到 Node Domain；整体图更新和软删除策略分别评估。 |
| UoW staging | Register methods only change EF tracking state; they do not call `SaveChanges`. / Register 方法只修改跟踪状态，不调用 SaveChanges。 | Preserve the staging/persistence separation. / 保留暂存与持久化分离。 |
| Explicit transaction | `BeginTransactionAsync` returns when either the UoW or DbContext already reports an active transaction. / UoW 或 DbContext 已报告活动事务时，BeginTransactionAsync 直接返回。 | Ownership must be explicit: joining a transaction is not the same as owning its commit/disposal. / 必须明确所有权；加入事务不等于拥有提交和释放责任。 |
| Commit | Calls `SaveChangesAsync`, then commits only the transaction held in the UoW's `_currentTransaction`. / 先执行 SaveChangesAsync，再只提交 UoW 自己持有的事务。 | There is an ownership edge case if DbContext has an external transaction while `_currentTransaction` is null. / 若 DbContext 有外部事务而 `_currentTransaction` 为空，就存在事务所有权边界问题。 |
| Rollback | Rolls back its owned transaction and clears the entire EF ChangeTracker. / 回滚自己持有的事务并清空整个 ChangeTracker。 | This detaches all tracked entities and does not restore already-mutated CLR objects. Failed contexts should be abandoned. / 这会分离所有已跟踪实体，也不会恢复已经修改的对象；失败上下文应被放弃。 |
| Dapper | Uses the same DbContext connection and passes its current EF transaction to Dapper; opens the connection synchronously when needed. / 使用同一 DbContext 连接并传入当前 EF 事务；必要时同步打开连接。 | Preserve shared connection/transaction semantics, but use async I/O in Node. / 保留共享连接和事务语义；Node 版使用异步 I/O。 |
| DI lifetime | UoW, DapperExecutor, repositories and DbContext are scoped. / UoW、DapperExecutor、仓储和 DbContext 均为 Scoped。 | The Node equivalent must isolate mutable persistence context per request/job. / Node 版必须按请求/任务隔离可变持久化上下文。 |
| Migration | The roadmap selects MySQL/Pomelo first, uses EF migrations, recommends reviewed production SQL/bundles, and rejects automatic schema migration on every service instance startup. / 路线文档先选 MySQL/Pomelo，采用 EF Migration，生产环境审核 SQL/Bundle，不建议每个服务实例启动时自动迁移。 | Preserve this operational policy. / 保留该运维原则。 |

### 8.1 Important Audit Findings / 重要审计发现

1. **The .NET Domain contract is less persistence-neutral than its description suggests.** `IRepository` exposes `IQueryable` and expression trees, and `IEntitySetProvider` lives in Domain. The Node Domain contract is deliberately narrower: Repository exposes aggregate queries (`findById`), while Unit of Work explicitly registers new/dirty/deleted aggregates and persists them at Commit. Keep ORM query types out of Domain.

   **.NET Domain 契约的持久化无关性弱于其描述。** `IRepository` 暴露 `IQueryable` 和表达式树，`IEntitySetProvider` 也位于 Domain。Node Domain 已有意收窄：Repository 负责聚合查询（`findById`），Unit of Work 显式登记新增/修改/删除聚合，并在 Commit 时统一持久化。不要将 ORM 查询类型重新引入 Domain。

2. **The .NET UoW has an ambiguous external-transaction case.** `HasActiveTransaction` considers both the DbContext and the UoW, but Commit only commits the UoW-owned field. Node must distinguish transaction owner, participant and committer.

   **.NET UoW 对外部事务的处理存在歧义。** `HasActiveTransaction` 同时检查 DbContext 和 UoW，但 Commit 只提交 UoW 自己持有的字段。Node 版必须区分事务所有者、参与者和提交者。

3. **Rollback does not restore object state.** Clearing a tracker/context prevents stale tracking from being flushed again; it does not reverse mutations made to objects already held by business code.

   **回滚不会恢复对象状态。** 清空跟踪器/上下文可以避免旧跟踪状态再次提交，但不会撤销业务代码已经对对象实例做出的修改。

4. **Soft delete currently reads the system clock in the generic repository.** The Node Domain has no mandatory equivalent contract. Do not add universal soft-delete behavior or read the clock inside generic persistence code without an explicit policy.

   **当前软删除在通用仓储中直接读取系统时间。** Node Domain 没有强制对应契约；没有明确策略前，不增加通用软删除行为，也不在通用持久化代码中读取系统时钟。

5. **The inspected .NET Infrastructure project references an EF Core 10 preview package while the README describes .NET 10.** The tracked repository tree also did not expose a dedicated test project or the CLI tool's implementation source, although docs describe regression fixtures and the migration workflow. These are audit gaps; they are not proof of runtime acceptance.

   **检查到的 .NET Infrastructure 项目引用 EF Core 10 Preview 包，而 README 描述的是 .NET 10。** 当前跟踪文件树中也没有看到独立测试项目或 CLI 工具实现源码，尽管文档描述了回归夹具和 Migration 工作流。这些属于审计缺口，不是运行时验收通过的证据。

## 9. Node Persistence Provider Evaluation / Node 持久化 Provider 评估

### 9.1 Candidate Comparison / 候选方案比较

| Candidate / 方案 | Advantages / 优势 | Trade-offs / 代价 | Assessment / 评估 |
|---|---|---|---|
| **MikroORM 7.2** | Data Mapper, Identity Map, change tracking, Unit of Work, implicit/explicit transactions, raw SQL in current transaction context, migrations and official MySQL driver. / Data Mapper、Identity Map、变更跟踪、UoW、隐式/显式事务、当前事务上下文中的原生 SQL、Migration 和官方 MySQL Driver。 | Stateful EntityManager must be isolated per request/job. Aggregate hydration, relation mapping and constructors need a POC. / 有状态 EntityManager 必须按请求/任务隔离；聚合还原、关系映射和构造函数需要 POC。 | **Leading candidate for first MySQL adapter; not yet approved. / 首个 MySQL 适配器的优先候选；尚未批准。** |
| Drizzle ORM | Typed SQL-first schema/query APIs and explicit transactions with savepoints. / 类型化 SQL 优先的 Schema/Query API，以及支持 Savepoint 的显式事务。 | Its central model is SQL/query composition rather than EF-style change-tracked aggregate Unit of Work; we would implement more persistence-context behavior ourselves. / 其核心模型是 SQL/Query 组合，而不是 EF 风格的变更跟踪聚合 UoW；更多持久化上下文行为需要自行实现。 | Strong alternative for a deliberately SQL-first design, but not the closest fit to the current EF behavior. / 是 SQL 优先设计的强备选，但与现有 EF 行为的贴合度较低。 |
| Prisma ORM | Generated TypeScript data access and migration workflow. / 生成式 TypeScript 数据访问和 Migration 工作流。 | Current Prisma 8 documentation describes MySQL as early preview while PostgreSQL is supported; Prisma 7 remains a separate stable line. / 当前 Prisma 8 文档将 MySQL 描述为 Early Preview，而 PostgreSQL 已支持；Prisma 7 是另一条稳定版本线。 | Do not select as the initial MySQL provider while current MySQL support remains preview-level. / 当前 MySQL 支持仍为 Preview 时，不选为首个 MySQL Provider。 |

### 9.2 Recommended Candidate / 推荐候选

Use **MikroORM 7.2 with its MySQL driver** as the first persistence proof-of-concept target, not yet as an approved or implemented dependency.

首轮持久化 POC 建议使用 **MikroORM 7.2 + MySQL Driver**，但目前它仍是候选方案，并非已批准或已实现的依赖。

Reasons / 原因：

- MikroORM explicitly uses Data Mapper, Unit of Work and Identity Map patterns. / MikroORM 明确采用 Data Mapper、Unit of Work 和 Identity Map 模式。
- `em.flush()` groups pending writes into a transaction when supported; `em.transactional()` and explicit `begin/commit/rollback` support wider transaction scopes. / 在支持的情况下，`em.flush()` 会将待处理写入集中到一个事务；也提供显式事务范围 API。
- Its official driver list includes MySQL, and migrations are available through a separate package and CLI. / 官方 Driver 列表包含 MySQL，并通过独立 Package 和 CLI 提供 Migration。
- EntityManager raw SQL execution uses the active transaction context, allowing a narrow raw-SQL adapter to participate in ORM transactions. / EntityManager 原生 SQL 使用活动事务上下文，使精简 SQL 适配器能够参与 ORM 事务。
- `EntitySchema` / `defineEntity` allow programmatic metadata, giving us a way to keep ORM decorators and provider types outside Domain. / `EntitySchema` / `defineEntity` 支持编程式元数据，可让 ORM Decorator 和 Provider 类型留在 Domain 之外。

### 9.3 Proposed Adapter Mapping / 建议适配方式

| Current Domain contract / 当前 Domain 契约 | Proposed adapter / 建议适配 |
|---|---|
| `IRepository.findById` | Load the aggregate and mapped state needed by its invariants through the scoped EntityManager. / 通过 Scoped EntityManager 加载聚合及其不变量所需状态。 |
| `IUnitOfWork.registerNew/registerDirty/registerDeleted` | Stage aggregate persistence intent in memory; no database write occurs until Commit. / 在内存中登记聚合持久化意图；Commit 前不执行数据库写入。 |
| `IUnitOfWork.commit` | Map and flush all registered changes; commit an explicitly owned transaction if one was opened. / 映射并 Flush 所有已登记变更；若显式开启了事务，则提交该事务。 |
| `IUnitOfWork.rollback` | Abandon the current persistence context; roll back only a transaction owned by that scope. Do not claim object instances are restored. / 放弃当前持久化上下文；只回滚该范围拥有的事务，不声称对象实例已恢复。 |
| Dapper-like API / Dapper 类 API | Add a small `IRawSqlExecutor` only when a real query requires it; adapt `EntityManager.execute` so it uses the active transaction. / 仅在真实查询需要时增加精简 `IRawSqlExecutor`；适配 `EntityManager.execute` 并确保复用活动事务。 |
| Explicit multi-operation transaction / 多操作显式事务 | Use a callback-based transaction scope. The future Application layer owns its port; Infrastructure provides the MikroORM implementation. / 使用回调式事务范围；未来 Application 拥有端口，Infrastructure 提供 MikroORM 实现。 |

**Do not add `beginTransaction()` to Domain's current `IUnitOfWork` just to mirror .NET.** The existing Domain contract intentionally contains only `commit()` and `rollback()`. A wider transaction boundary should be a separate callback-based port owned by the layer that needs it.

**不要为了模仿 .NET 就给当前 Domain 的 `IUnitOfWork` 增加 `beginTransaction()`。** 现有 Domain 契约有意只包含 `commit()` 和 `rollback()`。更大范围的事务边界应由真正需要它的层定义独立回调式端口。

### 9.4 Transaction Semantics / 事务语义

- Ordinary aggregate changes may be persisted with one ORM flush transaction. / 普通聚合变更可通过一次 ORM Flush 事务持久化。
- Mixed ORM and raw-SQL work must run in one explicit transaction context. / ORM 与原生 SQL 混合操作必须运行在同一个显式事务上下文中。
- MikroORM `em.transactional()` defaults to NESTED/savepoint propagation. The .NET implementation's existing-transaction behavior is closer to REQUIRED/join-existing. The Node adapter must choose and test propagation explicitly. / MikroORM `em.transactional()` 默认采用 NESTED/Savepoint；原 .NET 实现对已有事务的处理更接近 REQUIRED/加入现有事务。Node 适配器必须显式选择并测试传播语义。
- Each concurrent request/job needs an isolated EntityManager context. After a failed unit of work, reload through a fresh context rather than reusing stale managed objects. / 每个并发请求/任务都需要独立 EntityManager；工作单元失败后，应通过新上下文重新加载，而不是复用旧托管对象。
- A participant must not commit or dispose a transaction owned by its caller. / 事务参与者不得提交或释放调用方拥有的事务。
- Database transactions do not make external HTTP or broker operations atomic; reliable cross-service delivery remains an Outbox concern. / 数据库事务不能使外部 HTTP 或 Broker 操作具备原子性；跨服务可靠投递仍由 Outbox 解决。

### 9.5 MySQL Migration Caveat / MySQL Migration 注意事项

MikroORM supports migration generation and transactional configuration, but its documentation explicitly notes that MySQL DDL forces implicit commits and cannot be rolled back like ordinary DML. Test real MySQL migration behavior and never advertise schema migrations as fully rollback-atomic.

MikroORM 支持 Migration 生成和事务配置，但其文档明确指出 MySQL DDL 会触发隐式提交，不能像普通 DML 一样回滚。必须验证真实 MySQL Migration 行为，不得宣称 Schema 变更具备完整回滚原子性。

Production policy remains: generate, review and deploy migrations explicitly; do not automatically apply schema changes on every service instance startup.

生产策略保持不变：显式生成、审核和部署 Migration；不要让每个服务实例启动时自动应用 Schema 变更。

## 10. Persistence POC Acceptance / 持久化 POC 验收标准

MikroORM is not approved as the framework's default provider until all checks pass:

以下检查全部通过前，不批准 MikroORM 成为框架默认 Provider：

1. **Domain isolation / Domain 隔离** — Map existing Domain classes externally; Domain must not import MikroORM or carry ORM decorators. / 在外部映射现有 Domain 类；Domain 不得导入 MikroORM 或携带 ORM Decorator。
2. **Aggregate restoration / 聚合还原** — Load Trade with Order and Refund state, then verify its behavior and invariants. / 加载包含 Order 和 Refund 状态的 Trade，再验证行为和不变量。
3. **Constructor/private state / 构造函数与私有状态** — Verify constructors, private fields/accessors and hydration. MikroORM normally skips constructors for managed entities unless explicitly configured; this must be reconciled with Domain invariants. / 验证构造函数、私有字段/访问器和实体还原；MikroORM 默认加载托管实体时不调用构造函数，必须证明这与 Domain 不变量兼容。
4. **Repository semantics / Repository 语义** — `findById` restores all state required by aggregate invariants; `save` handles both new and loaded aggregates. / `findById` 恢复不变量所需状态；`save` 正确处理新聚合和已加载聚合。
5. **UoW failure lifecycle / UoW 失败生命周期** — Verify flush, failed flush, rollback, context abandonment and reload. / 验证 Flush、Flush 失败、回滚、上下文放弃和重新加载。
6. **Shared transaction / 共享事务** — In one transaction, perform an ORM write and raw SQL write; force a failure and prove both roll back. / 在同一事务中执行 ORM 和原生 SQL 写入；人为制造失败，证明两者都回滚。
7. **Propagation/ownership / 传播与所有权** — Verify REQUIRED/join-existing behavior and ensure inner components never commit outer transactions. / 验证 REQUIRED/加入现有事务，并确保内部组件不会提交外层事务。
8. **Concurrent isolation / 并发隔离** — Prove parallel requests/jobs do not share identity maps or transaction state. / 证明并发请求/任务不会共享 Identity Map 或事务状态。
9. **MySQL type behavior / MySQL 类型行为** — Verify BIGINT identifiers, decimal precision, nullability, indexes, unique constraints and relation delete behavior. / 验证 BIGINT、Decimal 精度、可空性、索引、唯一约束和关系删除行为。
10. **Migration / Migration** — Generate, review and execute migrations on disposable MySQL; test destructive diffs and data-preserving rename scenarios. / 在一次性 MySQL 中生成、审核和执行 Migration；测试破坏性差异及保留数据的 Rename 场景。
11. **Lifecycle / 生命周期** — Verify connection pool startup, failure cleanup, graceful shutdown and `orm.close()`. / 验证连接池启动、失败清理、优雅关闭和 `orm.close()`。
12. **Example/evidence / 示例与证据** — Add a bilingual real-adapter example and record actual unit/integration results; static review alone is not acceptance. / 增加双语真实适配器示例并记录实际测试结果；静态审查不算验收。

## 10.1 Trade Hydration Finding and Mapping Decision / Trade 还原发现与映射决策

The first concrete review of the existing Domain example reveals that directly mapping the current Domain classes as MikroORM managed entities is not a safe default.

对现有 Domain 示例进行首次具体审查后发现：不能默认将当前 Domain 类直接映射为 MikroORM 托管实体。

### Why direct mapping is risky / 直接映射的风险

- MikroORM 7.2 does not invoke constructors when hydrating managed entities by default. Its `forceEntityConstructor` option exists for cases such as native JavaScript private fields, but constructor invocation must be compatible with ORM hydration. / MikroORM 7.2 默认在还原托管实体时不调用构造函数。它提供 `forceEntityConstructor` 以支持原生 JavaScript 私有字段等场景，但构造函数必须能够兼容 ORM 还原过程。
- The current `Trade` constructor requires an ID and initialized Order/Refund arrays. The current `Order` constructor requires product and pricing data. These constructors are domain creation APIs, not parameterless persistence hydrators. / 当前 `Trade` 构造函数要求 ID 及初始化后的 Order/Refund 数组；`Order` 构造函数要求商品和价格数据。这些构造函数是领域创建 API，不是无参持久化还原器。
- `AggregateRoot` initializes its pending-event collection and aggregate-root brand as class fields. Bypassing constructors/field initializers can leave those runtime members absent on a hydrated instance. / `AggregateRoot` 通过类字段初始化器创建待处理事件集合和聚合根标记。绕过构造函数/字段初始化器，可能导致还原实例缺失这些运行时成员。
- `Order.currentStatus` is private and is not accepted as constructor input. Hydration must not bypass the domain state-transition rules merely to assign a stored status. / `Order.currentStatus` 是私有状态，构造函数也不接收该值。不能为了写入数据库状态，就绕过领域状态转换规则直接赋值。

### Decision / 决策

**The POC will use separate persistence records and explicit mapping; it will not register the existing Domain classes as MikroORM entities.**

**POC 使用独立的持久化记录模型并进行显式映射；不把现有 Domain 类注册为 MikroORM Entity。**

The intended flow is:

预期流程：

```text
MySQL rows
    ↓
MikroORM persistence records
    ↓ explicit reconstitution through Domain constructors and behaviors
Domain aggregate (Trade / Order / Refund)
    ↓ explicit mapping
MikroORM persistence records
    ↓
MySQL rows
```

This is an Infrastructure anti-corruption mapping, not a second Domain model. Persistence records describe storage shape and relations; Domain classes continue to own identity, state transitions, invariants and domain events. Do not add ORM decorators, ORM base classes, or persistence-specific constructors to Domain.

这是 Infrastructure 内部的防腐映射，不是再造一套 Domain 模型。持久化记录描述存储结构和关系；Domain 类继续拥有身份、状态转换、不变量和领域事件。不得向 Domain 添加 ORM Decorator、ORM 基类或持久化专用构造函数。

### Required mapping behavior / 映射行为要求

1. Loading Trade must eagerly load all Order and Refund data required by current aggregate behavior. / 加载 Trade 时必须加载当前聚合行为所需的全部 Order 和 Refund 数据。
2. Rebuild Order status by replaying valid domain transitions from the initial state (pending → confirmed → refunded), not by writing private fields. / Order 状态必须从初始状态通过合法领域转换还原（pending → confirmed → refunded），不得直接写私有字段。
3. Rebuild Trade through its public constructor so the aggregate brand and pending-event collection are initialized. / 通过 Trade 公共构造函数重建聚合，确保聚合根标记和待处理事件集合完成初始化。
4. A loaded aggregate starts with no pending events; historical events are not re-emitted during hydration. / 加载后的聚合不应携带待处理事件；历史事件不得在还原时重新发出。
5. Saving must reconcile existing and new child records without deleting or duplicating records accidentally. / 保存时必须协调已有和新增子记录，避免意外删除或重复写入。
6. If a persisted status cannot be reconstructed through valid domain behavior, fail loudly and treat it as corrupted/incompatible data. / 如果持久化状态无法通过合法领域行为还原，应明确失败，并将数据视为损坏或不兼容。

### POC scope adjustment / POC 范围调整

The first spike will prove Domain-to-record mapping and round-trip aggregate restoration before implementing the generic Repository/UoW API. This isolates the most important compatibility risk and avoids prematurely publishing an adapter contract.

首轮技术验证先证明 Domain 与持久化记录之间的映射及聚合往返还原，再实现通用 Repository/UoW API。这样可以隔离最重要的兼容风险，避免过早发布适配器契约。

### Current POC implementation / 当前 POC 实现

The isolated experiment now has a caller-configured MikroORM bootstrap, restricted to the dedicated `aspros_trade_poc` database, a reviewable idempotent MySQL DDL script, and Trade-specific Repository/Unit of Work adapters. Opt-in integration tests cover both direct record persistence and the adapter path. These tests have not been executed locally. The SQL schema includes a composite foreign key so a Refund cannot reference an Order belonging to a different Trade.

独立实验现已具备由调用方提供连接配置的 MikroORM 启动入口，并且只允许连接专用的 `aspros_trade_poc` 数据库；同时提供可审查、可重复执行的 MySQL DDL 脚本。可选集成测试会持久化映射后的 Trade/Order/Refund 记录，创建全新的 EntityManager Identity Map，重新加载对象图并重建 Domain 聚合。SQL Schema 使用复合外键，避免 Refund 引用属于其他 Trade 的 Order。

The integration test is opt-in via `MYSQL_POC_DATABASE_URL`; without it, Vitest skips the MySQL suite. It deletes only rows carrying the unique IDs generated by that test. These changes are not runtime-verified until the project owner runs the documented commands against a disposable MySQL instance.

集成测试通过 `MYSQL_POC_DATABASE_URL` 显式启用；未设置时 Vitest 会跳过 MySQL 测试。测试只删除自身生成的唯一 ID 对应记录。在项目所有者使用一次性 MySQL 实例执行文档中的命令前，这些改动仍未获得真实运行验证。


## 10.2 Repository and Unit of Work Adapter POC / Repository 与 Unit of Work 适配器验证

The isolated Trade POC now contains a concrete, Trade-specific implementation of the Domain `IRepository<Trade, number>` and `IUnitOfWork` contracts. This is still an experiment, not a public or generic Infrastructure API.

独立 Trade POC 现已包含 Domain `IRepository<Trade, number>` 和 `IUnitOfWork` 契约的 Trade 专用实现。这仍然是实验代码，不是公开或通用的 Infrastructure API。

### Scope ownership / Scope 所有权

- `createTradePersistenceScope(rootEntityManager)` forks a fresh EntityManager with a cleared identity map but does not begin a transaction. The returned Repository and Unit of Work share this same EntityManager. / `createTradePersistenceScope(rootEntityManager)` 会 Fork 一个 Identity Map 已清空的 EntityManager，但不会自动开启事务。返回的 Repository 与 Unit of Work 共享该 EntityManager。
- The scope rejects a root EntityManager that is already in a transaction. It does not silently create an independent transaction when the caller may expect REQUIRED/join-existing behavior. / 若 Root EntityManager 已处于事务中，Scope 会拒绝创建；不会在调用方可能期待 REQUIRED/加入现有事务时，静默创建独立事务。
- Commit maps and flushes registered changes, then commits an explicitly owned transaction if present. Rollback discards registrations and rolls back only an explicitly owned transaction. Both paths clear the identity map; a failed commit/rollback makes the scope unusable. / Commit 映射并 Flush 已登记变更；若存在显式拥有的事务，再提交该事务。Rollback 丢弃登记，并且只回滚显式拥有的事务。两条路径都会清空 Identity Map；Commit/Rollback 失败后 Scope 不可继续使用。
- A failed database transaction does not rewind mutated in-memory Domain objects. The caller must discard the scope and reload aggregates in a new one. / 数据库事务失败不会还原已变化的内存 Domain 对象。调用方必须丢弃当前 Scope，并在新 Scope 中重新加载聚合。

### Repository behavior / Repository 行为

- `findById` loads Trade, all its Orders, and all its Refunds before invoking the explicit Domain mapper. / `findById` 会先加载 Trade、其全部 Order 和 Refund，再调用显式 Domain Mapper。
- `registerNew`、`registerDirty` 和 `registerDeleted` 只在内存中登记变更，不要求活动事务，也不执行数据库写入。Commit 是唯一的持久化边界。 / `registerNew`、`registerDirty` 和 `registerDeleted` 只在内存中登记变更，不要求活动事务，也不执行数据库写入。Commit 是唯一的持久化边界。
- Existing child rows are reconciled by ID. Because the current Domain example has no child-removal behavior, a persisted child omitted from the supplied aggregate causes an explicit consistency error instead of an implicit delete. / 已有子记录按 ID 协调。由于当前 Domain 示例没有子实体删除行为，若传入聚合遗漏已持久化子记录，会明确抛出一致性错误，而不是隐式删除。
- New child IDs are checked for collisions. New/updated Refund records are linked to the managed Trade and Order records in the current identity map. / 新子实体 ID 会检查冲突；新增/更新的 Refund 会关联当前 Identity Map 中托管的 Trade 和 Order 记录。
- The adapter does not yet implement optimistic concurrency/version columns, soft deletion, aggregate child removal, or generic repository composition. / 此适配器尚未实现乐观并发/版本列、软删除、聚合子实体删除或通用 Repository 组合。

### Same-transaction SQL / 同事务 SQL

MikroORM 7.2 documents a first-class Kysely integration through `EntityManager.getKysely()`. Kysely operations issued through the same EntityManager while its explicit transaction is active use that transaction context; a forked EntityManager without the transaction context uses the pool instead. This is a promising Node equivalent for the reference framework's Dapper-style raw SQL access, without introducing a second independently managed connection.

MikroORM 7.2 文档提供了通过 `EntityManager.getKysely()` 使用 Kysely 的一等集成。在同一个 EntityManager 的显式事务活动期间执行 Kysely 操作，会使用该事务上下文；没有事务上下文的 Fork EntityManager 则会使用连接池。这有望成为参考框架中 Dapper 风格原生 SQL 访问在 Node 技术栈中的对应方案，并避免再独立管理第二条连接。

The POC now separates query-only Repository behavior from Unit of Work registration. Register methods stage aggregate intent in memory; Commit performs mapping and ORM flush. The explicit-transaction rollback probe verifies that registered changes are discarded before Commit and that independent Kysely work in the same scope is rolled back. This test is added but has not been run.

POC 现已将只读查询 Repository 与 Unit of Work 变更登记分离。Register 方法只在内存中登记聚合意图；Commit 才执行映射和 ORM Flush。显式事务回滚探针验证 Commit 前登记的变更可以被丢弃，并验证同一 Scope 中独立执行的 Kysely 操作会随事务回滚。该测试已加入但尚未运行。

### Explicitly deferred / 明确暂缓

REQUIRED propagation, joining a caller-owned transaction, nested savepoint policy, Transactional Outbox, and event publication remain deferred. The Kysely same-transaction path has now been added as an opt-in integration probe but is not yet verified. In particular, Domain events are not automatically cleared by this POC: event capture, durable outbox persistence, publication and clearing must be coordinated so events are not lost between database commit and delivery.

REQUIRED 传播、加入调用方事务、嵌套 Savepoint 策略、Transactional Outbox 和事件发布仍暂缓。Kysely 同事务路径已加入可选集成验证，但尚未验证。特别是此 POC 不会自动清空 Domain 事件：事件捕获、Outbox 持久化、事件发布和清空必须协调，避免数据库提交与事件投递之间丢失事件。

### Verification status / 验证状态

Opt-in MySQL integration cases now invoke the dedicated versioned migration runner before persistence tests and verify the executed/pending migration list. No typecheck, unit test, migration run, or MySQL test has been executed in the current environment. All adapter and migration behavior remains pending local verification against the disposable `aspros_trade_poc` database.

可选 MySQL 集成测试现会先调用独立版本化 Migration Runner，再执行持久化测试，并检查已执行/待执行 Migration 列表。本环境尚未执行类型检查、单元测试、Migration 或 MySQL 测试。所有适配器和 Migration 行为仍待在一次性 `aspros_trade_poc` 数据库上进行本地验证。

## 10.4 Transaction Propagation Policy / 事务传播策略

The current `TradePersistenceScope` forks an isolated EntityManager but does not open a transaction. A transaction is opened only when `beginTransaction()` is explicitly called on its Unit of Work. This keeps the default persistence lifecycle aligned with Register → Commit while allowing multiple operations to share one owned transaction when required.

当前 `TradePersistenceScope` 只 Fork 隔离的 EntityManager，不会自动开启事务。只有在 Unit of Work 上显式调用 `beginTransaction()` 才会开启事务。默认生命周期因此符合 Register → Commit，同时允许有需要时让多个操作共享一个由当前 Unit of Work 拥有的事务。

### Initial propagation policy / 首版传播策略

| Policy | Intended semantics | Decision |
|---|---|---|
| `REQUIRED` | Join an existing transaction or create the root transaction. Only the root owner commits/rolls back. | Opt-in policy for operations that explicitly require a transaction; not the default Unit of Work behavior. |
| `NESTED` | Savepoint on the same connection; inner rollback does not commit/rollback the outer transaction. | Advanced opt-in; defer implementation until identity-map and in-memory Domain state behavior are verified. |
| `REQUIRES_NEW` | Suspend outer work and use an independent transaction/connection. | Advanced opt-in; use sparingly due to pool exhaustion and lock contention risks. |
| `MANDATORY` | Require an active Unit of Work. | Can be a boundary assertion, not a new transaction implementation. |
| `SUPPORTS`, `NOT_SUPPORTED`, `NEVER` | Optional non-transactional propagation modes. | Excluded from the first framework contract. |

| 策略 | 目标语义 | 决策 |
|---|---|---|
| `REQUIRED` | 加入已有事务；若不存在则创建根事务。只有根事务所有者可以提交/回滚。 | 仅供明确要求事务的操作选择使用，不是 Unit of Work 的默认行为。 |
| `NESTED` | 在同一连接上创建 Savepoint；内层回滚不提交/回滚外层事务。 | 高级可选能力；Identity Map 和内存 Domain 状态行为验证前暂缓实现。 |
| `REQUIRES_NEW` | 挂起外层工作，使用独立事务/连接。 | 高级可选能力；连接池耗尽与锁竞争风险意味着必须谨慎使用。 |
| `MANDATORY` | 要求存在活动 Unit of Work。 | 可实现为边界断言，不需要新的事务实现。 |
| `SUPPORTS`、`NOT_SUPPORTED`、`NEVER` | 可选的非事务传播模式。 | 不纳入首版框架契约。 |

The Domain `IUnitOfWork` remains persistence-neutral and exposes explicit registration (`registerNew`, `registerDirty`, `registerDeleted`), `beginTransaction`, `commit`, `rollback`, and `hasActiveTransaction`. Register methods stage intent only; Commit performs persistence. Explicit transactions are disabled by default. A future Application transaction orchestration port may define propagation when Application work begins; do not add MikroORM enums, EntityManager, transaction handles, or Node async-context APIs to Domain.

Domain 的 `IUnitOfWork` 保持持久化技术无关，并采用显式 Register/Commit 语义：`registerNew`、`registerDirty`、`registerDeleted`、`beginTransaction`、`commit`、`rollback` 和 `hasActiveTransaction`。Register 方法只在内存中登记意图；Commit 才执行真正的持久化。默认不显式开启事务。不得向 Domain 添加 MikroORM 枚举、EntityManager、事务句柄或 Node 异步上下文 API。

MikroORM 7.2 defaults differ by API: `em.transactional()` defaults to NESTED while `@Transactional()` defaults to REQUIRED. Any adapter must specify propagation explicitly rather than rely on API defaults. A failed transaction detaches managed objects without rewinding their in-memory state; recovery must use a fresh EntityManager and reloaded aggregates.

MikroORM 7.2 不同 API 的默认值不同：`em.transactional()` 默认 NESTED，而 `@Transactional()` 默认 REQUIRED。任何适配器都必须显式指定传播策略，不得依赖 API 默认值。事务失败会使托管对象脱离上下文，但不会还原其内存状态；恢复时必须使用新的 EntityManager 并重新加载聚合。

The current POC implements one explicitly owned transaction per Unit of Work and does not implement nested scopes, REQUIRES_NEW, or an implicit ambient transaction context. A scope without `beginTransaction()` is non-transactional at the business-operation level; MikroORM may still wrap its single flush in an internal transaction.

当前 POC 每个 Unit of Work 最多拥有一个显式事务，不实现嵌套 Scope、REQUIRES_NEW 或隐式环境事务上下文。未调用 `beginTransaction()` 的 Scope 在业务操作层面不显式开启事务；MikroORM 仍可能为单次 Flush 使用内部事务。

## 10.5 Migration and Runtime Lifecycle Policy / Migration 与运行时生命周期策略

### Migration / 数据库迁移

- Migration is a release/deployment operation, never an implicit side effect of application startup. / Migration 是发布/部署操作，不是应用启动时的隐式副作用。
- Generate schema differences in development, commit versioned migration files and snapshots, review SQL and data impact, then execute them in a dedicated serialized deployment step using least-privilege credentials. / 在开发环境生成 Schema 差异，提交版本化 Migration 文件和快照，审查 SQL 与数据影响，再通过独立、串行的部署步骤执行，并使用最小权限凭据。
- MySQL DDL such as `CREATE TABLE`, `ALTER TABLE`, and `CREATE INDEX` implicitly commits the active transaction. Do not claim that a multi-statement DDL migration can be rolled back atomically. Prefer expand/contract changes, explicit data backfills, backups and forward-recovery plans. / MySQL 的 `CREATE TABLE`、`ALTER TABLE`、`CREATE INDEX` 等 DDL 会隐式提交当前事务。不能声称多语句 DDL Migration 可以原子回滚。应优先采用 Expand/Contract 变更、明确的数据回填、备份和向前修复方案。
- MikroORM Schema Generator is development tooling. Generated SQL must be reviewed; `schema:update` and `schema:fresh` must never run against production. / MikroORM Schema Generator 是开发工具。生成 SQL 必须审查；绝不可在生产环境运行 `schema:update` 或 `schema:fresh`。
- Migration execution must be observable and serialized per database/schema; do not let every application replica run migrations at startup. / Migration 执行必须可观测，并按数据库/Schema 串行化；不要让每个应用副本在启动时执行 Migration。
- The current POC runner does not implement a distributed lock. Its operational contract is one migration process at a time, enforced by the operator/deployment caller. This is sufficient for a disposable single-user POC, not for production orchestration. / 当前 POC Runner 不实现分布式锁。其运维契约是同一时刻只运行一个 Migration 进程，由操作者/部署调用方保证。这仅适用于一次性、单用户 POC，不适用于生产部署编排。
- Production should first use the deployment platform's database/schema-scoped concurrency group or lease/mutex so only one migration job can run. Keep migration execution outside application replicas. / 生产环境应优先使用部署平台提供的数据库/Schema 级并发组或租约/互斥锁，确保同一时刻只有一个 Migration Job 运行；Migration 执行应与应用副本分离。
- A MySQL `GET_LOCK()` implementation is a possible database-level alternative, but it must hold a dedicated physical connection for the entire migration run and release the lock on that same session. Do not acquire/release it through independent pool queries: a pooled query may use a different session. If the lock-owning connection is lost, migration execution must be treated as unsafe and stopped. / MySQL `GET_LOCK()` 可以作为数据库级备选方案，但必须在整个 Migration 运行期间持有专用物理连接，并在同一会话中释放锁。不得通过彼此独立的连接池查询获取/释放锁，因为池查询可能使用不同会话。若锁持有连接丢失，必须视为 Migration 执行不再安全并停止执行。

The isolated POC uses a versioned MikroORM Migration class as its canonical table-schema source. The operator/deployment process must create the database itself first; neither the framework nor the migration runner creates database instances or databases. The runner creates or changes tables only inside the already existing, explicitly allow-listed disposable `aspros_trade_poc` database. Ordinary ORM bootstrap does not register `Migrator`; migrations run only through a separate explicit command. The former hand-applied `schema.mysql.sql` file has been removed to avoid maintaining two DDL sources.

独立 POC 使用版本化 MikroORM Migration 类作为数据表结构的唯一来源。操作者或部署流程必须先创建 Database；框架和 Migration Runner 都不负责创建数据库实例或 Database。Runner 只会在已经存在、且名称经过严格白名单校验的一次性 `aspros_trade_poc` 数据库内部创建或修改数据表。普通 ORM 启动入口不注册 `Migrator`；只有通过独立显式命令才会执行 Migration。原先手工执行的 `schema.mysql.sql` 已删除，避免维护两套 DDL 来源。

### Failure recovery and status semantics / 失败恢复与状态查询语义

The POC's `status` command deliberately does not call `migrator.getExecuted()` or `migrator.getPending()`. Those APIs initialize the Migrator; for the standard SQL flow, initialization ensures that the migration-history table exists. Instead, status uses read-only queries against `information_schema.TABLES` and, only when the history table already exists, reads its recorded migration names. It reports whether the history table exists, executed/pending names, the expected POC table inventory, and a coarse schema state. A normal unapplied later migration is reported as `pending`; missing tables owned by an executed migration are `inconsistent`. This is an inventory check, not a full column/index/constraint drift validator.

POC 的 `status` 命令刻意不调用 `migrator.getExecuted()` 或 `migrator.getPending()`。这些 API 会初始化 Migrator；在标准 SQL 流程中，初始化会确保 Migration 历史表存在。因此 status 改为对 `information_schema.TABLES` 执行只读查询，并且仅在历史表已经存在时读取已记录的 Migration 名称。它会报告历史表是否存在、已执行/待执行名称、POC 预期表清单，以及粗粒度 Schema 状态。这只是表清单检查，并非完整的列/索引/约束漂移校验。

The mutating `up` path may initialize the Migrator and create its history table. Each registered migration has a small target-table list used only as recovery-scope metadata; the Migration class remains the sole DDL source. Before applying pending migrations, the runner checks each pending migration only against its own target tables. Tables created by earlier successful migrations therefore do not block a later migration. If a pending migration's own target table already exists without a matching history record, the runner refuses automatic execution. This catches common partial-DDL recovery cases without treating `CREATE TABLE IF NOT EXISTS` as proof of schema correctness. The metadata is deliberately limited to table names; it is not a second schema manifest.

会修改数据库的 `up` 路径可以初始化 Migrator 并创建历史表。每个已注册 Migration 都有一份简短的目标表清单，仅作为失败恢复范围元数据；Migration 类仍然是唯一 DDL 来源。执行待处理 Migration 前，Runner 只检查该 Migration 自己负责的目标表。因此，之前成功执行的 Migration 创建的表不会阻止后续 Migration。如果待执行 Migration 自己负责的表已经存在、但没有对应的执行历史，Runner 就拒绝自动执行。这可以捕获常见的部分 DDL 失败恢复场景，同时不会把 `CREATE TABLE IF NOT EXISTS` 当作 Schema 正确性的证明。这份元数据刻意只记录表名，不是第二份 Schema Manifest。

Migration execution emits structured `migration.started`, `migration.completed`, and `migration.failed` JSON log records with the migration name, timestamps, duration, and error details when available. The failure log preserves the original exception by rethrowing it unchanged. A failed MySQL DDL migration may leave earlier statements applied while no executed-history row exists; operators must inspect actual schema state and choose a deliberate forward repair or a disposable-POC reset. Never blindly retry, manually mark the migration as executed, or assume a database rollback reverted DDL.

Migration 执行会输出结构化 JSON 日志事件：`migration.started`、`migration.completed` 和 `migration.failed`；尽可能包含 Migration 名称、时间戳、耗时和错误详情。失败日志记录后原样重新抛出异常，保留原始异常信息。MySQL DDL Migration 失败时，前面的语句可能已经生效，但历史表中没有已执行记录；运维人员必须检查真实 Schema 状态，再明确选择向前修复或重置一次性 POC。绝不可盲目重试、手工标记 Migration 已执行，或假设数据库回滚已经撤销 DDL。


### ORM/connection lifecycle / ORM 与连接生命周期

- Initialize one ORM instance per process/database configuration. It owns the connection pool and metadata. / 每个进程/数据库配置初始化一个 ORM 实例，由它拥有连接池和元数据。
- Fork an EntityManager/identity map per request or background job. Never share one mutable EntityManager across concurrent work. / 每个请求或后台任务 Fork 独立 EntityManager/Identity Map。绝不在并发任务间共享同一个可变 EntityManager。
- A Unit of Work owns its forked context and transaction, not the process-wide pool. / Unit of Work 拥有自己的 Fork 上下文以及显式开启的事务，不拥有进程级连接池。
- Graceful shutdown stops new work, drains active requests/jobs, settles active transactions, then closes the ORM/pool once. Forced close is an emergency path only. / 优雅关闭应先停止接收新任务，排空活动请求/后台任务，处理完活动事务，再统一关闭 ORM/连接池。强制关闭仅用于紧急情况。
- Use database readiness checks separately from process liveness. Retry only whole operations that are safe to retry, and always use a fresh EntityManager after transaction failure. / 数据库 Readiness 与进程 Liveness 分开检查。仅重试安全且具备幂等性的完整操作；事务失败后始终使用新的 EntityManager。

These lifecycle concerns belong to Node Infrastructure; Domain remains independent of Node APIs, connection pools and ORM types.

这些生命周期职责属于 Node Infrastructure；Domain 不依赖 Node API、连接池或 ORM 类型。

## 10.3 Object Model Boundaries / 对象模型边界

The framework distinguishes persistence records (DO), domain objects, application transfer models (DTO), and API view models (VO). These names describe different responsibilities; they are not interchangeable aliases for one shared class.

框架区分持久化记录（DO）、领域对象、应用传输模型（DTO）和 API 视图模型（VO）。这些名称代表不同职责，不应成为同一个共享类的不同别名。

- **DO / Persistence Record** belongs to Infrastructure and describes the selected storage shape. It may flatten a Domain Value Object into columns, store it as JSON, split one domain concept across tables, or combine several domain concepts where persistence requires it. / **DO / 持久化记录** 属于 Infrastructure，描述选定的存储结构。它可以将 Domain Value Object 展开为多个字段、存储为 JSON，也可以按持久化需要拆分或合并领域概念。
- **Domain Model** owns business meaning, behavior, identity, invariants, and aggregate boundaries. It must not depend on ORM metadata or database schema. / **Domain Model** 拥有业务语义、行为、身份、不变量和聚合边界，不依赖 ORM 元数据或数据库 Schema。
- **DTO** is introduced at an actual transfer boundary, such as an application command/query contract or an external service contract. It is not a universal object reused by every layer. / **DTO** 只在真实的数据传输边界引入，例如应用命令/查询契约或外部服务契约，不是供所有层复用的万能对象。
- **VO / View Object** belongs to the API/presentation boundary and is shaped for a particular response. One Domain aggregate may have multiple response models. / **VO / View Object** 属于 API/表现层边界，按具体响应场景设计；一个领域聚合可以对应多个响应模型。
- **Mapper / Assembler** performs explicit conversions at boundaries. Infrastructure owns persistence-to-domain mapping; API/presentation code owns domain/query-result-to-response mapping. / **Mapper / Assembler** 在边界处执行显式转换。Infrastructure 负责持久化模型与领域模型的映射；API/表现层代码负责领域对象或查询结果到 API 响应模型的映射。

The common reconstitution/read path is database rows → DO/persistence records → Domain aggregate → application result/DTO → API response VO. A command/write path runs in the opposite direction: API request DTO → Application → Domain behavior → persistence mapping/DO → database. Read queries may use a purpose-built read model and need not reconstruct a Domain aggregate when no domain behavior or invariant is being executed. Storage technologies such as Redis and ClickHouse are not automatically authoritative sources for reconstructing transactional aggregates; authority and consistency must be explicit per use case.

常见的还原/读取路径为：数据库记录 → DO/持久化记录 → Domain 聚合 → 应用结果/DTO → API 响应 VO。命令/写入路径则反向执行：API 请求 DTO → Application → Domain 行为 → 持久化映射/DO → 数据库。若查询不执行领域行为或维护领域不变量，可以使用专用读模型，无需还原 Domain 聚合。Redis、ClickHouse 等存储不会自动成为事务聚合的权威还原来源；必须针对具体用例明确数据权威性和一致性。


This is a business-code layering convention and does not require every framework capability to introduce all four object types. The Infrastructure package must not define API VOs or application DTOs.

这是一项业务代码分层约定，并不要求框架的每项能力都必须引入全部四种对象。Infrastructure package 不定义 API VO 或应用 DTO。

## 10.6 Versioned Migration Runner POC / 版本化 Migration Runner 验证

The isolated POC now includes `@mikro-orm/migrations@7.2.9`, a versioned initial schema migration, and a dedicated command entrypoint. The ordinary `createTradePocOrm()` bootstrap remains migration-free. Only the explicit `poc:trade-migrate` command or the opt-in MySQL integration suite invokes the runner.

独立 POC 现加入 `@mikro-orm/migrations@7.2.9`、版本化初始 Schema Migration 和独立命令入口。普通 `createTradePocOrm()` 启动入口仍完全不执行 Migration。只有显式运行 `poc:trade-migrate` 或主动启用 MySQL 集成测试时才会调用 Runner。

- The runner validates the MySQL URL and exact database name `aspros_trade_poc` before connecting. / Runner 在连接前验证 MySQL URL 和数据库名称必须严格为 `aspros_trade_poc`。
- The migration history table is `poc_schema_migrations`; the schema migration is statically registered, avoiding runtime directory discovery in this POC. / Migration 历史表为 `poc_schema_migrations`；本 POC 静态注册 Migration 类，不依赖运行时目录扫描。
- Only `up` and `status` commands are exposed. No CLI `down`, `fresh`, or destructive schema reset command is provided. / 只开放 `up` 和 `status`；不提供 CLI `down`、`fresh` 或破坏性 Schema 重置命令。
- MySQL DDL is configured with `transactional: false` and `allOrNothing: false`. The migration statements use `CREATE TABLE IF NOT EXISTS`; this supports safe re-entry after inspection, but does not make multi-statement DDL atomic. / MySQL DDL 配置为 `transactional: false` 和 `allOrNothing: false`。Migration 使用 `CREATE TABLE IF NOT EXISTS`，便于检查后重试，但不代表多语句 DDL 具备原子性。
- The migration's `down()` is defined for completeness, but the runner deliberately offers no rollback command. Any destructive reversal remains a separately reviewed manual operation on disposable data. / Migration 定义了 `down()`，但 Runner 刻意不开放回滚命令。任何破坏性逆向操作都必须作为独立审查的手工操作，并且只允许针对一次性数据。
- The former `schema.mysql.sql` duplicate source has been removed. The migration class is the single POC schema definition. / 已删除原先重复的 `schema.mysql.sql`；Migration 类是 POC 唯一 Schema 定义。

This is still an experiment, not a production migration framework. Production adoption still needs reviewed migration generation, deployment serialization/locking, least-privilege credentials, observability, backup/forward-recovery procedures, and tests against a disposable MySQL instance. No migration or integration test has been executed in the current environment.

这仍然只是实验，不是生产 Migration 框架。正式采用前仍需补齐 Migration 生成与审核、部署串行化/锁、最小权限凭据、可观测性、备份/向前修复流程，并在一次性 MySQL 实例上实际测试。本环境尚未执行 Migration 或集成测试。

## 11. Current Result and Next Step / 当前结论与下一步

**Audited / 已审计：** tracked .NET Database, Repository, UnitOfWork, Dapper and migration design files. Transaction ownership and Domain/Infrastructure boundary risks are recorded above.

已审计当前 .NET Database、Repository、UnitOfWork、Dapper 和 Migration 设计源码；事务所有权与 Domain/Infrastructure 边界风险已记录。

**Recommended, pending POC / 已推荐，等待 POC：** MikroORM 7.2 + MySQL driver. The latest 7.2 patch observed during this review is 7.2.9; pin the exact patch in the isolated experiment and keep it out of the production Infrastructure dependency graph until acceptance. / 首选候选为 MikroORM 7.2 + MySQL Driver。本次审查时观察到的 7.2 最新补丁版本为 7.2.9；在独立实验中固定具体补丁版本，在验收通过前不将其加入生产 Infrastructure 依赖图。

已推荐首轮使用 MikroORM 7.2 + MySQL Driver，但等待 POC 验证。

**POC scaffold added / 已加入 POC 骨架：** an isolated `experiments/mikroorm-trade-poc` workspace package now defines separate Trade/Order/Refund persistence records and an explicit mapper with mapping tests. MikroORM 7.2.9 dependencies are isolated from `@aspros/infrastructure`; these tests have not yet been executed in a local Node/pnpm environment. / 已新增独立 `experiments/mikroorm-trade-poc` 工作区 package，定义独立的 Trade/Order/Refund 持久化记录、显式 Mapper 和映射测试。MikroORM 7.2.9 依赖与 `@aspros/infrastructure` 隔离；这些测试尚未在本地 Node/pnpm 环境执行。

正式 `@aspros/infrastructure` package 尚未添加 MikroORM 依赖、数据库适配器、原生 SQL 执行器或 Migration 文件；MikroORM 依赖目前只存在于独立 POC package，且尚无真实 MySQL 集成测试。

**New finding / 新发现：** direct ORM hydration of the current Domain classes is not the preferred approach. The POC will map separate MikroORM persistence records to and from Domain objects by calling public Domain constructors and legal state-transition methods. / 不建议让 ORM 直接还原当前 Domain 类。POC 将使用独立 MikroORM 持久化记录，通过调用 Domain 公共构造函数和合法状态转换方法完成双向映射。

**Next / 下一步：** after the local Docker environment is ready, run typecheck/unit tests and verify the Register/Commit and Migration Runner POCs against the disposable MySQL database. Cover default non-transactional scope, explicit transaction rollback, new/dirty/deleted registration, fresh migration apply, a second no-op apply after success, read-only status against both an empty and initialized history table, and a simulated partial-DDL state that the runner must reject. Inspect the structured start/completion/failure logs. Before production adoption, decide whether full column/index/foreign-key drift validation is worth its ongoing complexity; do not add a second schema source merely for completeness. Keep database provisioning outside the framework and finalize deployment locking/runtime lifecycle only when a real deployment target requires it. / 本地 Docker 环境准备好后，执行类型检查、单元测试，并在一次性 MySQL 数据库中验证 Register/Commit 与 Migration Runner POC。验证默认不显式开启事务、显式事务回滚、新增/修改/删除登记、首次 Migration、成功后的第二次无操作执行、空历史表和已初始化历史表下的只读状态查询，以及 Runner 必须拒绝执行的模拟部分 DDL 残留状态。检查结构化开始/完成/失败日志。正式采用前，还需补充完整的列/索引/外键漂移校验，并最终确定部署锁和运行时生命周期。

Application remains deferred until required Infrastructure capabilities have working implementations and verification evidence.

所需 Infrastructure 能力具备可运行实现和验证证据之前，Application 仍保持延期。

## References / 参考资料

- .NET source / .NET 源码：[UnitOfWork.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/UnitOfWork.cs), [IDbContext.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/IDbContext.cs), [BaseRepository.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/BaseRepository.cs), [IDapperExecutor.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/Dapper/IDapperExecutor.cs), [IUnitOfWork.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Domain/UoW/IUnitOfWork.cs).
- MikroORM / MikroORM 文档：[Unit of Work](https://mikro-orm.io/docs/unit-of-work), [Transactions](https://mikro-orm.io/docs/transactions), [Getting Started and drivers](https://mikro-orm.io/docs/guide), [Migrations](https://mikro-orm.io/docs/migrations), [Entity definitions](https://mikro-orm.io/docs/defining-entities), [Entity constructors](https://mikro-orm.io/docs/entity-constructors), [Kysely integration and transaction context](https://mikro-orm.io/docs/kysely), [MySQL implicit commits](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).
- Drizzle ORM / Drizzle 文档：[Transactions](https://orm.drizzle.team/docs/transactions).
- Prisma ORM / Prisma 文档：[ORM overview and supported databases](https://www.prisma.io/docs/orm).
