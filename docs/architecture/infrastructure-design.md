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
| UnitOfWork | Coordinate persistence operations and explicit transaction boundaries. / 协调持久化操作和显式事务边界。 | Implement Domain IUnitOfWork; ordinary single-operation work should not require an unnecessary explicit transaction. / 实现 Domain IUnitOfWork；普通单次操作不应被迫开启多余事务。 |
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

1. **The .NET Domain contract is less persistence-neutral than its description suggests.** `IRepository` exposes `IQueryable` and expression trees, and `IEntitySetProvider` lives in Domain. The Node Domain contract is deliberately narrower (`findById` and `save`); keep that decision and do not reintroduce ORM query types.

   **.NET Domain 契约的持久化无关性弱于其描述。** `IRepository` 暴露 `IQueryable` 和表达式树，`IEntitySetProvider` 也位于 Domain。Node Domain 已有意收窄为 `findById` 和 `save`；应保留该决策，不要重新引入 ORM 查询类型。

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
| `IRepository.save` | Register new aggregates; let the ORM Unit of Work track changes on loaded aggregates. / 登记新聚合；由 ORM UoW 跟踪已加载聚合的变更。 |
| `IUnitOfWork.commit` | Candidate: call EntityManager `flush()`; verify inside and outside explicit transactions. / 候选：调用 EntityManager `flush()`；分别验证显式事务内外的行为。 |
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

## 11. Current Result and Next Step / 当前结论与下一步

**Audited / 已审计：** tracked .NET Database, Repository, UnitOfWork, Dapper and migration design files. Transaction ownership and Domain/Infrastructure boundary risks are recorded above.

已审计当前 .NET Database、Repository、UnitOfWork、Dapper 和 Migration 设计源码；事务所有权与 Domain/Infrastructure 边界风险已记录。

**Recommended, pending POC / 已推荐，等待 POC：** MikroORM 7.2 + MySQL driver.

已推荐首轮使用 MikroORM 7.2 + MySQL Driver，但等待 POC 验证。

**Not implemented / 尚未实现：** no MikroORM dependency, database adapter, raw SQL executor, migration files or integration tests have been added to the Node workspace.

Node 工作区尚未添加 MikroORM 依赖、数据库适配器、原生 SQL 执行器、Migration 文件或集成测试。

**Next / 下一步：** build an isolated persistence spike around the existing Trade aggregate before exposing any public adapter API. If hydration, constructor behavior or transaction sharing cannot meet the POC criteria cleanly, reassess the provider before adding a production dependency.

围绕现有 Trade 聚合建立隔离的持久化技术验证，在此之前不发布公共适配器 API。如果聚合还原、构造函数行为或事务共享无法清晰满足 POC 标准，就应在引入生产依赖前重新评估 Provider。

Application remains deferred until required Infrastructure capabilities have working implementations and verification evidence.

所需 Infrastructure 能力具备可运行实现和验证证据之前，Application 仍保持延期。

## References / 参考资料

- .NET source / .NET 源码：[UnitOfWork.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/UnitOfWork.cs), [IDbContext.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/IDbContext.cs), [BaseRepository.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/EntityFramework/BaseRepository.cs), [IDapperExecutor.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Infrastructure/Dapper/IDapperExecutor.cs), [IUnitOfWork.cs](https://github.com/aspros-luo/Aspros.Basic.Framework/blob/master/framework/Aspros.Base.Framework.Domain/UoW/IUnitOfWork.cs).
- MikroORM / MikroORM 文档：[Unit of Work](https://mikro-orm.io/docs/unit-of-work), [Transactions](https://mikro-orm.io/docs/transactions), [Getting Started and drivers](https://mikro-orm.io/docs/guide), [Migrations](https://mikro-orm.io/docs/migrations), [Entity definitions](https://mikro-orm.io/docs/defining-entities), [Entity constructors](https://mikro-orm.io/docs/entity-constructors).
- Drizzle ORM / Drizzle 文档：[Transactions](https://orm.drizzle.team/docs/transactions).
- Prisma ORM / Prisma 文档：[ORM overview and supported databases](https://www.prisma.io/docs/orm).
