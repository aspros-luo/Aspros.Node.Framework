# Domain Package Design / Domain 模块设计

**Version / 版本：Draft 1.1**  
**Status / 状态：First implementation baseline / 首版实现基线**

This document is the single source of truth for Domain scope and design decisions.

本文件是 Domain 范围和设计决策的唯一事实来源。

## 1. Goals and Non-goals / 目标与非目标

Domain provides a small, runtime-portable set of Practical DDD building blocks and domain-facing contracts. It provides defaults without imposing business modeling rules.

Domain 提供一组精简、可跨 Runtime 使用的实用型 DDD 构件和面向领域的契约。它提供便利默认实现，但不强加业务建模规则。

Domain does not implement database access, ORM, migrations, transaction engines, message brokers, HTTP, dependency injection, application handlers, or Node.js runtime adapters.

Domain 不实现数据库访问、ORM、迁移、事务引擎、消息代理、HTTP、依赖注入、应用 Handler 或 Node.js Runtime 适配器。

## 2. Design Decisions / 设计决策

| Area / 领域 | Decision / 决策 |
|---|---|
| DDD style / DDD 风格 | Practical DDD / 实用型 DDD |
| Inheritance / 继承 | Optional convenience base classes; composition and custom implementations remain valid. / 基类仅作便利实现；组合和自定义实现同样有效。 |
| Entity ID / 实体 ID | `string \| number \| bigint`; supplied externally. / 由外部提供。 |
| Entity equality / 实体相等性 | Concrete runtime type + `Object.is(id)`; mutable attributes are ignored. / 具体运行时类型 + `Object.is(id)`；不比较可变属性。 |
| Value Objects / 值对象 | No framework base class, equality protocol, deep comparison or runtime freezing. Business code owns semantics. / 不提供框架基类、相等协议、深度比较或运行时冻结；语义由业务负责。 |
| Aggregate Root / 聚合根 | Optional base adds event collection only; no child-entity manager or mandatory root forwarding. / 可选基类仅增加事件收集，不管理子实体，也不强制根转发行为。 |
| Repository / 仓储 | Aggregate-oriented persistence-neutral contract. / 面向聚合且与持久化技术无关的契约。 |
| Unit of Work / 工作单元 | Contract only; implementation and transaction lifecycle belong to outer layers. / 仅定义契约；实现和事务生命周期属于外层。 |
| Events / 事件 | Aggregate records events; delivery follows successful commit. / 聚合记录事件；成功提交后再投递。 |
| Errors / 错误 | Typed errors with stable codes and optional cause. / 类型化错误、稳定代码和可选 cause。 |
| Runtime / 运行时 | No Node.js-specific APIs or dependencies in Domain. / Domain 不使用 Node.js 专属 API 或依赖。 |

## 3. Directory Layout / 目录结构

```text
packages/domain/
├── src/
│   ├── entities/       # Entity, AggregateRoot, identity contracts / 实体、聚合根、身份契约
│   ├── repositories/   # Repository contracts / 仓储契约
│   ├── uow/            # Unit of Work contract / 工作单元契约
│   ├── events/         # DomainEvent / 领域事件
│   ├── errors/         # DomainError / 领域错误
│   ├── services/       # DomainService contract / 领域服务契约
│   ├── specifications/ # In-memory specifications / 内存规约
│   └── index.ts
├── examples/simple/    # Trade / Order / Refund / 简单领域示例
├── tests/
└── README.md
```

## 4. Entities and Aggregate Roots / 实体与聚合根

### Entity

The optional `Entity<TId>` base stores a readonly ID and compares entities by concrete runtime type plus ID. Numeric IDs must be finite. Use bigint/string for database BIGINT values that may exceed JavaScript's safe integer range.

可选的 `Entity<TId>` 基类保存只读 ID，并按运行时具体类型和 ID 比较实体。数值 ID 必须为有限数值。可能超过 JavaScript 安全整数范围的数据库 BIGINT 应使用 bigint/string。

Entity does not generate IDs. It does not freeze the entity or compare its attributes. A business model may implement identity behavior itself.

Entity 不生成 ID，不冻结实体，也不比较实体属性。业务模型可以自行实现身份行为。

### Value Object

The framework deliberately does not define a Value Object base class, `equals()`, deep equality, or a generic immutability mechanism. The framework cannot know whether a business value such as Money, Address, or DateRange should compare by currency, normalization, interval semantics, or another rule.

框架有意不定义 Value Object 基类、`equals()`、深度相等比较或通用不可变机制。框架无法知道 Money、Address、DateRange 等业务值应按币种、标准化形式、区间语义还是其他规则比较。

Value-object validation, equality, copying, and immutability are owned by the business type.

值对象的验证、相等性、复制和不可变性由具体业务类型负责。

### Aggregate Root

`IAggregateRoot` communicates the aggregate-root role at the contract level. `AggregateRoot<TId>` is an optional convenience base extending Entity and adding domain-event collection.

`IAggregateRoot` 在契约层表达聚合根角色。`AggregateRoot<TId>` 是可选便利基类，继承 Entity 并增加领域事件收集。

The base class does not add/remove/find child entities, hide child entities, or require all operations to be forwarded through the root. The business model chooses whether to expose child entities and whether to offer root-level orchestration methods.

基类不增加、删除或查找内部实体，不强制隐藏子实体，也不要求所有操作都由根转发。业务模型自行决定是否公开内部实体，以及是否提供聚合根统一编排方法。

When a business chooses an aggregate as a consistency boundary, that business model remains responsible for protecting its invariants. Loose framework constraints do not mean loose business invariants.

当业务选择聚合作为一致性边界时，仍由业务模型负责保护不变量。框架约束宽松，不代表业务不变量可以松散。

## 5. Repository and Unit of Work / 仓储与工作单元

`IRepository<TAggregate, TId>` provides `findById` and `save`. A repository should load the state needed to enforce the aggregate's invariants. Business-specific repositories may extend this contract with meaningful queries.

`IRepository<TAggregate, TId>` 提供 `findById` 和 `save`。仓储应加载维护聚合不变量所需的状态。业务专属仓储可按实际需要扩展有意义的查询。

`IUnitOfWork` provides `commit` and `rollback` only. It does not expose a database context, connection, ORM session, or transaction implementation. Application coordinates its lifecycle; Infrastructure implements it.

`IUnitOfWork` 仅提供 `commit` 和 `rollback`。它不暴露数据库上下文、连接、ORM Session 或事务实现。Application 协调其生命周期；Infrastructure 实现它。

## 6. Domain Events and Errors / 领域事件与错误

Domain events carry `eventId`, `eventType`, `occurredAt`, and `eventVersion`. Values are supplied by callers; Domain does not call runtime ID/time APIs. Aggregate roots record events and expose a snapshot. The caller clears them only after a successful commit.

领域事件包含 `eventId`、`eventType`、`occurredAt` 和 `eventVersion`。这些值由调用方提供；Domain 不调用 Runtime ID/时间 API。聚合根记录事件并提供快照；调用方仅在成功提交后清空事件。

Clearing events does not restore mutated in-memory state after a failed transaction. A failed Unit of Work should be discarded and aggregates reloaded. Reliable event delivery is an Application/Infrastructure concern; Transactional Outbox is the recommended later implementation.

清空事件不会在事务失败后恢复已变化的内存状态。失败的 Unit of Work 应被丢弃，并重新加载聚合。可靠事件投递属于 Application/Infrastructure；后续建议实现 Transactional Outbox。

Domain errors expose stable machine-readable codes. HTTP mapping and localization belong to outer layers.

Domain Error 暴露稳定的机器可读代码。HTTP 映射和本地化属于外层。

## 7. Domain Example / Domain 示例

`examples/simple` demonstrates a Trade aggregate containing Order entities and Refund entities. Order has its own `confirm()`; Trade also offers `confirmOrder()` and `refundOrder()`. Both direct entity behavior and aggregate-root orchestration are valid choices in the example. This is illustrative, not a mandatory framework rule.

`examples/simple` 展示 Trade 聚合包含 Order 实体和 Refund 实体。Order 自身提供 `confirm()`；Trade 也提供 `confirmOrder()` 和 `refundOrder()`。示例同时展示直接调用实体行为和聚合根统一编排，两种方式都成立。这只是示例，不是框架强制规则。

The example's in-memory repository and Unit of Work are explicitly demonstration-only; they do not provide durable storage or atomic transactions. A later formal demo will exercise real outer-layer adapters.

示例中的内存 Repository 和 Unit of Work 明确仅用于演示，不提供持久化存储或原子事务。后续正式 Demo 将使用真实外层适配器。

## 8. Verification / 验证

- Strict TypeScript checks cover source, tests, and examples. / 严格 TypeScript 检查覆盖源码、测试和示例。
- Tests cover Entity identity, aggregate event lifecycle, DomainError cause/code, Specification composition, and Trade example behavior. / 测试覆盖 Entity 身份、聚合事件生命周期、DomainError cause/code、Specification 组合和 Trade 示例行为。
- Domain source has no Node.js-specific imports. / Domain 源码无 Node.js 专属导入。
- Package build output contains only public source, not tests or examples. / package 构建产物仅包含公共源码，不包含测试和示例。
- Public APIs and meaningful comments are bilingual. / 公共 API 和有意义的注释为双语。

## 9. Explicitly Deferred / 明确延期

Minimum published Node.js support policy, CJS output, persistence implementation, ORM query translation, Outbox dispatcher, and formal end-to-end demo are not part of this first Domain implementation.

正式发布的 Node.js 支持策略、CJS 输出、持久化实现、ORM 查询转换、Outbox Dispatcher 和正式端到端 Demo 均不属于本次 Domain 首版范围。
