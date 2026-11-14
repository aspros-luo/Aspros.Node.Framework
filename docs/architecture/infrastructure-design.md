# Infrastructure Design / Infrastructure 设计

**Status / 状态：Initial capability inventory and package scaffold / 已建立首轮能力清单与 Package 骨架**

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

The initial infrastructure package scaffold is complete. The next task is the reference-framework audit and provider comparison, starting with relational persistence and transaction behavior. Application remains deferred until the required infrastructure capabilities have working implementations and verification evidence.

Infrastructure package 初始骨架已完成。下一项工作是审计参考框架并比较技术供应商，优先从关系型持久化和事务行为开始。所需基础设施能力具备可运行实现和验证证据之前，Application 仍保持延期。
