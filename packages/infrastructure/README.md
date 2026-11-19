# @aspros/infrastructure

Technical adapters and runtime integrations for the Aspros Node Framework.

Aspros Node Framework 的技术适配器与运行时集成层。

## Current Status / 当前状态

The package now includes a small, provider-neutral lifecycle coordinator for explicitly registered process-level resources. A first Redis JSON cache adapter is now implemented with lifecycle integration, focused unit tests, an opt-in Redis integration test, and a usage example. Database production adapters, messaging, ClickHouse, HTTP/gRPC, service discovery, and provider-specific observability adapters remain unimplemented.

本 package 现已提供轻量生命周期协调器，以及首个 Redis JSON 缓存适配器。Redis 适配器已接入生命周期，配有针对性单元测试、可选 Redis 集成测试和使用示例。生产数据库适配器、消息、ClickHouse、HTTP/gRPC、服务发现和供应商专属可观测性适配器仍未实现。

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

The public entry point exports `InfrastructureRuntime`, `InfrastructureResource`, and `RedisCache`. See [the lifecycle example](./examples/runtime-lifecycle.ts) and [Redis cache example](./examples/redis-cache.ts). The host supplies typed Redis options and an error handler, then explicitly registers the cache with the runtime. Run unit tests with `pnpm --filter @aspros/infrastructure test`; run the opt-in Redis integration test with `REDIS_CACHE_URL=redis://... pnpm --filter @aspros/infrastructure test:redis`.

公共入口导出 `InfrastructureRuntime`、`InfrastructureResource` 和 `RedisCache`。参见[生命周期示例](./examples/runtime-lifecycle.ts)及 [Redis 缓存示例](./examples/redis-cache.ts)。宿主提供类型化 Redis 配置和错误处理回调，再将缓存实例显式注册到 Runtime。使用 `pnpm --filter @aspros/infrastructure test` 运行单元测试；使用 `REDIS_CACHE_URL=redis://... pnpm --filter @aspros/infrastructure test:redis` 运行可选 Redis 集成测试。
