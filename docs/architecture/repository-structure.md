# Repository Structure / 仓库结构

**Status / 状态：Domain baseline established; Infrastructure package scaffold initialized / Domain 基线已建立；Infrastructure Package 骨架已初始化**

## 1. Repository Shape / 仓库整体结构

The repository uses a pnpm workspace. Domain is the first package. Infrastructure now has an initialized package boundary and capability design baseline. Application follows after required infrastructure capabilities have working implementations and verification evidence.

仓库采用 pnpm workspace。Domain 是首个 package。Infrastructure 现已建立 package 边界和能力设计基线。待所需基础设施能力具备可运行实现和验证证据后，再建设 Application。

~~~text
Aspros.Node.Framework/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── docs/architecture/
│   ├── repository-structure.md
│   ├── domain-design.md
│   └── infrastructure-design.md
└── packages/
    ├── domain/
    │   ├── src/
    │   ├── examples/simple/
    │   ├── tests/
    │   └── package.json, tsconfig*.json, README.md
    ├── infrastructure/
    │   ├── src/index.ts
    │   ├── package.json
    │   ├── tsconfig*.json
    │   └── README.md
    ├── application/       # after infrastructure / Infrastructure 完成后
    └── runtime-node/      # platform-specific runtime integration / 平台专属运行时集成
~~~

The Infrastructure package currently contains only its package entry point and workspace configuration. Capability folders are added as each design is approved; empty directories and speculative public APIs are intentionally avoided.

Infrastructure package 当前仅包含 package 入口和工作区配置。每项能力的设计获准后再增加对应目录；有意避免创建空目录和猜测性公共 API。

## 2. Domain Directory Responsibilities / Domain 目录职责

- entities/: Entity identity, aggregate-root role and optional base classes. / 实体身份、聚合根角色和可选基类。
- repositories/: persistence-neutral aggregate repository contracts. / 与持久化技术无关的聚合仓储契约。
- uow/: Unit of Work contract only; no transaction implementation. / 仅定义工作单元契约，不实现事务。
- events/: domain event contracts and metadata. / 领域事件契约与元数据。
- errors/: typed domain errors and stable codes. / 类型化领域错误与稳定代码。
- specifications/: reusable in-memory domain predicates. / 可复用的内存领域判断条件。
- examples/simple/: Trade / Order / Refund usage example. / Trade / Order / Refund 用法示例。
- tests/: package behavior tests, including example behavior. / package 行为测试，包括示例行为。

## 3. Layer Responsibilities / 分层职责

### Domain

Owns domain building blocks and domain-facing contracts. It has no dependency on other framework packages, databases, HTTP frameworks, message brokers, or Node.js APIs.

负责领域构件和面向领域的契约。不依赖其他框架 package、数据库、HTTP 框架、消息代理或 Node.js API。

### Infrastructure

Implements technical capabilities and adapters without owning domain rules. The detailed capability inventory and provider decisions are maintained in [Infrastructure Design](infrastructure-design.md).

负责实现技术能力和适配器，不拥有领域规则。详细能力清单和供应商选型记录在 [Infrastructure 设计](infrastructure-design.md) 中。

The initial capability areas are:

首轮能力范围包括：

- **Persistence:** database connections and pools, relational database adapters, Repository and Unit of Work implementations, transactions, migrations, and raw SQL execution. / **持久化：** 数据库连接与连接池、关系型数据库适配、Repository 与 Unit of Work 实现、事务、迁移和原生 SQL 执行。
- **Cache:** cache contracts/adapters, Redis integration, and justified distributed primitives. / **缓存：** 缓存契约与适配器、Redis 集成，以及有充分理由时的分布式基础能力。
- **Messaging:** broker integration, producer/consumer lifecycle, acknowledgements, retries, dead-letter handling, and Outbox/Inbox. / **消息：** 消息代理集成、生产者/消费者生命周期、确认、重试、死信处理和 Outbox/Inbox。
- **Analytics:** ClickHouse integration, batch ingestion and analytical access. / **分析存储：** ClickHouse 集成、批量写入和分析查询。
- **Service communication:** HTTP, selected RPC/gRPC, service discovery and resilience policies. / **服务通信：** HTTP、选定的 RPC/gRPC、服务发现和弹性策略。
- **Operations:** structured logging, metrics, tracing, health checks, configuration and registration/bootstrap foundations. / **运维：** 结构化日志、指标、链路追踪、健康检查、配置和注册/启动基础能力。

These are design targets, not claims that providers have been selected or implementations completed. Public abstractions require a real adapter, tests and a bilingual usage example.

这些是设计目标，不代表已经选定供应商或完成实现。公共抽象必须配套真实适配器、测试和双语使用示例。

### Application (after Infrastructure) / Application（Infrastructure 完成后）

Owns use cases, orchestration, authorization flow and application-level coordination. It consumes Domain contracts and the infrastructure capabilities selected for the application, while remaining independent of concrete provider implementations.

负责用例、编排、授权流程和应用级协调。它使用 Domain 契约及应用所需的基础设施能力，但不依赖具体供应商实现。

Application should be designed after the required Infrastructure capabilities have been implemented and validated. Its ports must be owned by the layer that needs them; implementation order must not cause Application to depend on concrete Infrastructure packages.

应在所需 Infrastructure 能力实现并验证后再设计 Application。端口契约应由真正需要它的层负责；不能因为先建设 Infrastructure，就让 Application 依赖具体 Infrastructure package。

### Runtime Node / Node Runtime

Contains capabilities that genuinely require Node.js APIs. Keep runtime-specific concerns out of Domain. Decide which capabilities belong here versus Infrastructure when the relevant adapter is designed.

包含确实需要 Node.js API 的能力。Node.js 专属事项不得进入 Domain。设计具体适配器时，再明确相关能力属于 Runtime Node 还是 Infrastructure。

## 4. Dependency Direction vs. Delivery Order / 依赖方向与建设顺序

The implementation sequence is:

实施顺序为：

~~~text
Domain → Infrastructure → Application → Microservice Demo
~~~

This sequence describes when we design and build each layer. It does **not** mean that runtime or compile-time dependencies point outward. The intended dependency rule remains:

该顺序描述各层的设计和建设时机，**不**代表运行时或编译时依赖向外指向。预期依赖规则保持不变：

~~~text
Application ───────> Domain <────── Infrastructure adapters

Service Host / Bootstrap ───────> Application
Service Host / Bootstrap ───────> Infrastructure
~~~

Domain defines its repository and Unit of Work contracts; Infrastructure implements them. For other technical capabilities, the owning port must be decided deliberately. Infrastructure must not introduce provider-specific dependencies into Domain, and Application must not be coupled to concrete database, Redis or broker SDKs.

Domain 定义 Repository 和 Unit of Work 契约，Infrastructure 负责实现。其他技术能力的端口归属必须经过明确设计。Infrastructure 不得把供应商专属依赖引入 Domain；Application 也不得耦合具体数据库、Redis 或消息代理 SDK。

## 5. Example Policy / 示例规范

Every package should include small examples for important public abstractions, not only API declarations. Examples must identify what is a contract, what is an implementation, and what is merely illustrative. Tests verify behavior; examples explain how consumers compose the pieces.

每个 package 的重要公共抽象都应配套小型示例，而不只是声明 API。示例必须区分契约、具体实现和仅供说明的内容。测试负责验证行为；示例负责说明使用者如何组合这些构件。

These focused examples do not replace the later formal end-to-end microservice demo under the repository-level examples directory.

这些分层小示例不能替代后续仓库根目录 examples 下的正式端到端微服务 Demo。

## 6. Tooling Baseline / 工具基线

| Concern / 事项 | Current choice / 当前选择 |
|---|---|
| Workspace / 工作区 | pnpm |
| Language / 语言 | TypeScript |
| Module format / 模块格式 | ESM |
| Type checking / 类型检查 | strict TypeScript |
| Tests / 测试 | Vitest |
| Domain target / Domain 编译目标 | ES2022 |
| Workspace Node baseline / Workspace Node 基线 | Node.js 22+ |

The workspace baseline is for development tooling, not a claim that Domain uses Node.js APIs. Revisit it when package support policy is finalized.

工作区基线用于开发工具链，不代表 Domain 使用 Node.js API。正式确定 package 支持策略时再复核。

## 7. Delivery Order / 推进顺序

1. **Complete and verify Domain.** Review public contracts, run strict type checks, tests and build, and record actual results. / **完成并验证 Domain。** 审查公共契约，运行严格类型检查、测试和构建，并记录真实结果。
2. **Audit and implement Infrastructure.** Audit the reference .NET framework, decide Node.js-appropriate package boundaries and providers, then implement and integration-test required capabilities. / **审计并实现 Infrastructure。** 审计参考 .NET 框架，确定适合 Node.js 的 package 边界和供应商，再实现并集成测试所需能力。
3. **Design and implement Application.** Build use cases and orchestration against verified Domain and Infrastructure capabilities. / **设计并实现 Application。** 基于已经验证的 Domain 和 Infrastructure 能力构建用例与编排。
4. **Complete runtime hosting and bootstrap integration.** Provide configuration, registration, startup and service-host composition. / **完成 Runtime Hosting 和 Bootstrap 集成。** 提供配置、注册、启动和服务宿主组合能力。
5. **Build the formal microservice demo.** Demonstrate service communication, persistence, cache, messaging, reliability, observability and integration tests using real adapters. / **建立正式微服务 Demo。** 使用真实适配器展示服务通信、持久化、缓存、消息、可靠性、可观测性和集成测试。

Do not start the formal microservice demo while required infrastructure capabilities are represented only by interfaces, in-memory fakes or unverified placeholders.

所需基础设施能力如果仍只有接口、内存 Fake 或未经验证的占位实现，就不要开始正式微服务 Demo。
