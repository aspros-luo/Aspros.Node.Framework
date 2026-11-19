# @aspros/infrastructure

Technical adapters and runtime integrations for the Aspros Node Framework.

Aspros Node Framework 的技术适配器与运行时集成层。

## Current Status / 当前状态

The package now includes a small, provider-neutral lifecycle coordinator for explicitly registered process-level resources. Database, Redis, messaging, ClickHouse, HTTP/gRPC, service-discovery, and provider-specific observability adapters are not implemented yet.

本 package 现已提供一个轻量、与供应商无关的生命周期协调器，用于管理显式注册的进程级资源。数据库、Redis、消息、ClickHouse、HTTP/gRPC、服务发现以及供应商专属可观测性适配器仍未实现。

The lifecycle coordinator has implementation, focused tests, and a usage example; runtime execution has not yet been verified. Provider capabilities remain unimplemented until their real adapters, tests, examples, and verification evidence exist.

生命周期协调器已具备实现、针对性测试和使用示例，但尚未完成运行验证。各 Provider 能力仍需真实适配器、测试、示例和验证证据，完成后才能视为已实现。

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

The public entry point exports `InfrastructureRuntime` and `InfrastructureResource`. See [the lifecycle example](./examples/runtime-lifecycle.ts). The coordinator is not a dependency-injection container: the host creates clients and explicitly registers their start/stop operations. Tests run with `pnpm --filter @aspros/infrastructure test`.

公共入口导出 `InfrastructureRuntime` 和 `InfrastructureResource`。参见[生命周期示例](./examples/runtime-lifecycle.ts)。协调器不是依赖注入容器：具体客户端由宿主创建，再显式注册其启动/停止操作。使用 `pnpm --filter @aspros/infrastructure test` 运行测试。
