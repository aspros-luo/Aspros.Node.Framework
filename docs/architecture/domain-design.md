# Domain Package Design / Domain 模块设计

**Version / 版本：Draft 1.0**  
**Status / 状态：Design baseline; implementation not started / 设计基线；尚未开始实现**

This document consolidates current Domain decisions. It is the single source of truth for Domain scope until superseded by an explicit architecture decision.

本文汇总当前 Domain 决策。在被明确的架构决策更新前，本文件是 Domain 范围的唯一事实来源。

## 1. Goals / 目标

The Domain package provides a small, stable set of domain-modeling building blocks for Practical DDD.

Domain package 为实用型 DDD 提供一组精简、稳定的领域建模基础构件。

- Express identity, value equality, aggregate boundaries, domain events, and domain errors. / 表达身份、值相等性、聚合边界、领域事件和领域错误。
- Provide useful defaults without forcing every business model to inherit framework classes. / 提供便利默认实现，但不强迫所有业务模型继承框架类。
- Keep domain rules independent from databases, transports, web frameworks, and Node.js APIs. / 领域规则独立于数据库、传输协议、Web 框架和 Node.js API。
- Support unit tests without starting a server, database, or message broker. / 无需启动服务器、数据库或消息代理即可进行单元测试。

## 2. Non-goals / 非目标

Domain does not implement HTTP controllers, routing, middleware, application handlers, database access, ORM mappings, migrations, Unit of Work implementations, Redis, queues, message brokers, DI containers, bootstrapping, HTTP status mapping, or API error serialization.

Domain 不负责实现 HTTP 控制器、路由、中间件、应用 Handler、数据库访问、ORM 映射、迁移、Unit of Work 实现、Redis、队列、消息代理、DI 容器、启动流程、HTTP 状态码映射或 API 错误序列化。

These belong in Application, Infrastructure, or runtime-specific packages.

这些职责属于 Application、Infrastructure 或运行时专属模块。

## 3. Agreed Design Decisions / 已确定设计决策

| Area / 领域 | Decision / 决策 |
|---|---|
| DDD style / DDD 风格 | Practical DDD / 实用型 DDD |
| Modeling constraints / 模型约束 | Moderate: defaults provided, inheritance optional / 适度约束：提供默认实现，继承可选 |
| Entity identity / Entity 身份 | Generic identifier `TId` / 泛型身份标识 `TId` |
| Domain events / 领域事件 | Aggregates record events; dispatch only after successful commit / 聚合记录事件；事务成功提交后才投递 |
| Domain errors / 领域错误 | Typed errors with stable machine-readable codes / 类型化异常与稳定机器可读错误代码 |
| Runtime portability / Runtime 可移植性 | Domain core avoids Node.js-specific APIs / Domain 核心不使用 Node.js 专属 API |
| Initial package shape / 初始包形态 | One `@aspros/domain` package; split only when justified / 初期一个 package，有充分理由再拆分 |

## 4. Runtime Portability / 运行时可移植性

Domain should avoid runtime-specific APIs and rely on standard language/platform capabilities, allowing use in compatible JavaScript runtimes such as Node.js, Bun, and Deno.

Domain 应避免运行时专属 API，仅依赖标准语言和平台能力，从而可在 Node.js、Bun、Deno 等兼容 JavaScript Runtime 中使用。

This does not mean the whole framework promises equal support for every runtime. Node.js remains the primary target; runtime-specific integrations belong in dedicated packages.

这不意味着整个框架承诺对所有 Runtime 提供同等支持。Node.js 仍是首要目标；运行时专属集成放在独立 package 中。

Domain must not directly call `process`, Node's `crypto`, filesystem APIs, or Node-specific timers. Identifiers and timestamps are supplied through explicit inputs or small injected abstractions.

Domain 不应直接调用 `process`、Node 的 `crypto`、文件系统 API 或 Node 专属定时器。标识符和时间戳通过显式参数或轻量注入抽象提供。

## 5. Proposed Package Structure / 建议目录结构

```text
packages/domain/
├── src/
│   ├── kernel/
│   │   ├── entities/
│   │   │   ├── entity.ts
│   │   │   └── aggregate-root.ts
│   │   ├── value-objects/
│   │   │   └── value-object.ts
│   │   ├── events/
│   │   │   └── domain-event.ts
│   │   ├── errors/
│   │   │   └── domain-error.ts
│   │   └── index.ts
│   ├── abstractions/
│   │   ├── repositories/repository.ts
│   │   ├── services/domain-service.ts
│   │   ├── specifications/specification.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── entities/
│   ├── value-objects/
│   ├── aggregates/
│   ├── events/
│   ├── errors/
│   └── specifications/
├── package.json
├── tsconfig.json
└── README.md
```

This is the target for the first Domain package implementation. Avoid folders and abstractions without concrete responsibilities.

这是首个 Domain package 实现时的目标结构。不要提前创建没有具体职责的目录和抽象。

## 6. Core Building Blocks / 核心构件

### 6.1 Entity

An Entity has identity that persists across changes to its attributes.

Entity 具有独立身份，其属性变化不会改变实体身份。

- Provide an optional `Entity<TId>` base class. / 提供可选的 `Entity<TId>` 基类。
- `TId` is generic; applications may use strings, numbers, UUID wrappers, or branded types. / `TId` 为泛型，可使用 string、number、UUID 包装类型或 branded type。
- Identity is immutable after construction. / 身份在构造后不可修改。
- Equality requires the same concrete entity type and identifier. / 相等判断要求具体实体类型和标识符均相同。
- Domain does not generate IDs internally; callers supply them. / Domain 内部不生成 ID，由调用方提供。
- Business entities may use composition or implement identity behavior themselves. Inheritance is optional. / 业务实体可以使用组合或自行实现身份行为，继承并非强制。

Branded types distinguish identifiers at compile time but do not provide runtime validation by themselves.

Branded type 可以在编译期区分不同身份类型，但本身不提供运行时校验。

### 6.2 Value Object

A Value Object is defined by its values rather than object identity.

Value Object 由其值定义，而不是由对象身份定义。

- Prefer immutability. / 优先采用不可变设计。
- Equality is based on declared value semantics, including nested values. / 相等性基于明确声明的值语义，包括嵌套值。
- Define explicit behavior for arrays, dates, maps, and compound values; do not rely on shallow reference equality. / 对数组、日期、Map 和复合值定义明确行为，不依赖浅层引用比较。
- TypeScript `readonly` is compile-time protection, not automatic deep runtime immutability. / TypeScript `readonly` 只提供编译期保护，不自动保证运行时深度不可变。
- Copy or freeze mutable input where needed. / 必要时复制或冻结可变输入。
- Avoid floating-point arithmetic for exact monetary values. Prefer integer minor units or a deliberate decimal strategy without binding Domain to a specific decimal library. / 精确金额避免浮点运算；优先使用最小货币单位整数或明确的 decimal 方案，Domain 不绑定具体 decimal 库。

### 6.3 Aggregate Root

An Aggregate Root protects aggregate invariants and acts as the external consistency boundary.

Aggregate Root 负责保护聚合不变量，并作为聚合对外的一致性边界。

- Provide an optional `AggregateRoot<TId>` convenience base class. / 提供可选的便利基类。
- Not every Entity is an Aggregate Root. / 不要让每个 Entity 都成为 Aggregate Root。
- Change state through meaningful business methods, not arbitrary external field mutation. / 通过有业务含义的方法修改状态，不允许外部任意修改字段。
- Aggregate-owned events are recorded through aggregate behavior. / 聚合事件通过聚合行为记录。
- Keep aggregate boundaries small and based on business consistency needs. / 聚合边界应精简，并由业务一致性需求决定。
- A transaction typically protects one aggregate; cross-aggregate workflows need explicit coordination and often eventual consistency. / 一个事务通常保护一个聚合；跨聚合流程需要显式协调，往往采用最终一致性。

### 6.4 Domain Event

A Domain Event records that a meaningful domain fact has occurred.

Domain Event 用于记录已经发生的、有业务意义的领域事实。

- Events are immutable. / 事件不可变。
- Suggested metadata: `eventId`, `eventType`, `occurredAt`, and `eventVersion`. / 建议元数据包括上述字段。
- Domain does not call `crypto.randomUUID()` or `Date.now()` directly; callers or injected abstractions supply ID and time. / Domain 不直接调用这些运行时函数；ID 和时间由调用方或注入抽象提供。
- Aggregates record events; they do not publish to a broker. / 聚合记录事件，不直接向消息代理发布。
- Application/Infrastructure owns transaction coordination and delivery. / Application/Infrastructure 负责事务协调和投递。

#### Commit and delivery / 提交与投递

“Publish after commit” is the required ordering, but direct post-commit publishing can lose events if the process crashes between commit and publish.

“提交成功后再投递”是必须遵守的顺序，但仅在提交后直接发布，可能因进程在两步之间崩溃而丢失事件。

The intended reliable approach is Transactional Outbox:

后续建议采用 Transactional Outbox：

1. Persist business state and its outbox record in the same database transaction. / 在同一数据库事务中保存业务状态和 Outbox 记录。
2. Commit the transaction. / 提交事务。
3. A dispatcher publishes committed outbox records. / Dispatcher 发布已提交的 Outbox 记录。
4. Retain failed records for retry. / 失败记录保留并重试。
5. Consumers use `eventId` or another stable key for idempotency. / 消费者使用 `eventId` 等稳定键实现幂等。

This is an Application/Infrastructure responsibility, not Domain implementation.

这是 Application/Infrastructure 的职责，不属于 Domain 实现。

If a transaction fails, its events must not be treated as published. Discard the failed unit of work and reload aggregates rather than assuming that clearing an in-memory event list restores mutated state.

事务失败时，事件不得被视为已发布。应丢弃失败工作单元并重新加载聚合，而不是认为清空内存事件列表就能恢复已变化的状态。

### 6.5 Domain Error

Domain errors represent violated business rules or invalid domain transitions.

Domain Error 表示业务规则被违反或领域状态转换不合法。

- Use typed errors with stable machine-readable codes. / 使用类型化异常和稳定机器可读错误代码。
- Codes must not depend on class names or localized messages. / 错误代码不依赖类名或本地化消息。
- Outer layers may localize messages; codes remain stable. / 外层可本地化消息，但代码保持稳定。
- Preserve an underlying `cause` when wrapping an error. / 包装异常时保留底层 `cause`。
- Do not map Domain errors to HTTP status codes here. / 本模块不将 Domain Error 映射为 HTTP 状态码。
- Do not disguise database/network errors as domain errors. / 不要将数据库或网络错误伪装成领域错误。

Codes such as `ORDER_ALREADY_CANCELLED` are business-specific examples, not built-in framework codes.

例如 `ORDER_ALREADY_CANCELLED` 属于具体业务示例，不是框架内置错误代码。

### 6.6 Repository Contract

A Repository contract provides a collection-like abstraction around aggregate persistence.

Repository 契约为聚合持久化提供类似集合的抽象。

- Focus on aggregate roots, not a generic CRUD repository for every table. / 以聚合根为中心，而不是每张表一个通用 CRUD Repository。
- Keep contracts persistence-technology-neutral. / 契约不绑定持久化技术。
- Do not expose SQL, ORM sessions, database contexts, or connection objects. / 不暴露 SQL、ORM Session、数据库上下文或连接对象。
- A minimal contract may include `findById` and `save`; add methods only when justified. / 最小契约可包含 `findById`、`save`，只有需求明确时才扩展。
- Implementations live in Infrastructure. / 具体实现位于 Infrastructure。

### 6.7 Domain Service

A Domain Service holds a domain rule that does not naturally belong to a single Entity or Value Object.

Domain Service 承载不适合归属于单个 Entity 或 Value Object 的领域规则。

It remains domain-focused and performs no database, HTTP, filesystem, or broker operations.

它只处理领域规则，不执行数据库、HTTP、文件系统或消息代理操作。

### 6.8 Specification

Specification encapsulates a reusable domain predicate.

Specification 用于封装可复用的领域判断条件。

Initial operations: `isSatisfiedBy(candidate)`, `and(other)`, `or(other)`, and `not()`.

初始操作包括：`isSatisfiedBy(candidate)`、`and(other)`、`or(other)` 和 `not()`。

The first version is an in-memory abstraction. ORM/query translation is out of scope until a real use case justifies an adapter.

第一版只提供内存领域判断抽象。ORM/查询转换暂不纳入范围，除非真实场景证明需要适配器。

## 7. TypeScript and API Rules / TypeScript 与 API 规范

- Enable strict type checking. / 启用严格类型检查。
- Prefer explicit public types and avoid leaking `any`. / 公共类型应明确，避免泄漏 `any`。
- Use generics to preserve real domain distinctions, not merely to make APIs look abstract. / 泛型用于保留真实领域差异，不为抽象而抽象。
- Validate untrusted runtime input at boundaries; compile-time types are not runtime validation. / 在边界校验不可信输入，编译期类型不是运行时校验。
- No Node.js-specific imports in Domain source or its transitive dependencies. / Domain 源码及其传递依赖不得引入 Node.js 专属模块。
- Keep public exports intentional. / 公共导出必须经过明确选择。
- Public APIs are documented in Chinese and English. / 公共 API 提供中英双语文档。

## 8. Bilingual Comment Standard / 双语注释标准

Comments explain intent, constraints, invariants, and non-obvious trade-offs. Do not narrate obvious syntax.

注释解释设计意图、约束、不变量和不明显的设计取舍，不翻译显而易见的语法。

Bilingual coverage is required for file purpose where needed, public types and methods, important parameters and return values, thrown errors, non-trivial algorithms, lifecycle rules, and edge cases.

文件用途（必要时）、公共类型与方法、重要参数和返回值、异常、非平凡算法、生命周期规则和边界情况均需双语说明。

Example / 示例：

```typescript
/**
 * 聚合根基类
 * Base class for aggregate roots.
 *
 * 聚合根是聚合边界的唯一外部访问入口，
 * 负责维护聚合内部的不变量。
 *
 * The aggregate root is the only external entry point
 * to an aggregate and protects its internal invariants.
 *
 * @typeParam TId 聚合根身份类型 / Aggregate root identifier type
 */
```

Chinese and English descriptions must carry the same meaning.

中英文说明必须表达相同含义。

## 9. Verification and Acceptance / 验证与验收

The package is not complete until applicable checks pass.

通过以下适用检查后，Domain package 才可视为完成。

### Static and dependency checks / 静态与依赖检查

- TypeScript strict type check passes. / TypeScript 严格类型检查通过。
- Package builds without Node.js runtime APIs. / 不依赖 Node.js 运行时 API 即可构建。
- No dependency on Application, Infrastructure, HTTP, database, ORM, or broker packages. / 不依赖 Application、Infrastructure、HTTP、数据库、ORM 或消息代理 package。
- Public exports are intentional and documented. / 公共导出经过明确选择并有文档说明。

### Behavioral tests / 行为测试

- Entity: same ID/type, different ID, and different entity type. / Entity：相同 ID/类型、不同 ID、不同实体类型。
- Value Object: nested equality, immutability, and mutable input handling. / Value Object：嵌套值相等性、不可变性和可变输入处理。
- Aggregate Root: invariant protection, event recording, and event lifecycle. / Aggregate Root：不变量保护、事件记录和事件生命周期。
- Domain Event: metadata, timestamp semantics, and version behavior. / Domain Event：元数据、时间语义和版本行为。
- Domain Error: stable codes, typed behavior, and `cause`. / Domain Error：稳定错误代码、类型行为和 `cause`。
- Specification: AND, OR, and NOT composition. / Specification：AND、OR、NOT 组合。

### Documentation checks / 文档检查

- Public APIs and meaningful comments are bilingual. / 公共 API 和有意义的注释均为双语。
- Documented behavior matches tested behavior. / 文档行为与测试行为一致。
- Planned features are not described as implemented. / 不得将计划功能描述为已实现。

## 10. Implementation Milestones / 实施里程碑

| Milestone / 阶段 | Scope / 范围 | Exit criteria / 完成标准 |
|---|---|---|
| D1 | Entity + Value Object | Identity/value equality and immutability tests pass / 身份、值相等性和不可变性测试通过 |
| D2 | Aggregate Root + Domain Event | Invariant and event lifecycle tests pass / 不变量和事件生命周期测试通过 |
| D3 | Domain Error | Stable codes and cause behavior pass / 稳定错误代码和异常链测试通过 |
| D4 | Domain abstractions | Repository, Domain Service, Specification reviewed and tested / 契约经过评审和测试 |
| D5 | Examples and acceptance | Example domain, full tests, bilingual docs, dependency checks / 示例领域、完整测试、双语文档和依赖检查完成 |

## 11. Open Decisions / 待定事项

Do not guess these prematurely; decide when they materially affect implementation.

不要提前猜测以下事项；在它们实际影响实现时再作决定。

1. Minimum supported Node.js version. / Node.js 最低支持版本。
2. ESM-only or dual ESM/CJS output. / 仅 ESM 或同时输出 ESM/CJS。
3. Test runner and coverage tooling. / 测试运行器和覆盖率工具。
4. Build and declaration generation strategy. / 构建与类型声明生成方案。
5. Exact public API after reviewing concrete TypeScript implementations. / 结合具体 TypeScript 实现评审最终公共 API。
6. License selection. / 许可证选择。
