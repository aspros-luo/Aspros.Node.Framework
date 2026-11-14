# @aspros/infrastructure

Technical adapters and runtime integrations for the Aspros Node Framework.

Aspros Node Framework 的技术适配器与运行时集成层。

## Current Status / 当前状态

This package is an initialized workspace scaffold. It does not yet provide database, Redis, messaging, ClickHouse, HTTP/gRPC, service-discovery, or observability implementations.

本 package 目前仅完成工作区初始化，尚未提供数据库、Redis、消息、ClickHouse、HTTP/gRPC、服务发现或可观测性实现。

Do not treat the package entry point as evidence that any infrastructure capability is implemented. A capability is considered implemented only after its contract, working adapter, tests, and usage example are present and verified.

不要将 package 入口文件视为基础设施能力已经实现的证据。只有具备契约、可运行适配器、测试和使用示例，并完成验证后，才能认定某项能力已经实现。

## Responsibility / 职责

- Implement Domain Repository and Unit of Work contracts using real persistence adapters. / 使用真实持久化适配器实现 Domain Repository 和 Unit of Work 契约。
- Provide technical adapters for cache, messaging, analytics, service communication, and operations. / 为缓存、消息、分析存储、服务通信和运维能力提供技术适配器。
- Keep provider-specific SDKs and runtime details out of Domain. / 将供应商 SDK 和运行时细节隔离在 Domain 之外。
- Keep business rules out of Infrastructure. / 不在 Infrastructure 中承载业务规则。

## Dependency Rules / 依赖规则

- Infrastructure may depend on Domain contracts. / Infrastructure 可以依赖 Domain 契约。
- Domain must never depend on Infrastructure. / Domain 绝不能依赖 Infrastructure。
- Infrastructure must not depend on Application. / Infrastructure 不得依赖 Application。
- Provider-specific dependencies are introduced only with an approved capability decision. / 只有在某项能力的技术决策获准后，才引入供应商专属依赖。

## Capability Design / 能力设计

See [Infrastructure Design / Infrastructure 设计](../../docs/architecture/infrastructure-design.md) for the capability inventory, reference-framework mapping, package boundaries, and pending provider decisions.

能力清单、参考框架映射、package 边界和待决技术选型，参见 [Infrastructure Design / Infrastructure 设计](../../docs/architecture/infrastructure-design.md)。

## Examples and Tests / 示例与测试

No public infrastructure abstraction is exported yet. Focused examples and tests will be added alongside each capability; the package will not publish speculative interfaces or in-memory placeholders as production infrastructure.

当前尚未导出任何公共基础设施抽象。每项能力的示例和测试将与其实现同步加入；不会把猜测性接口或内存占位实现作为生产基础设施发布。
