# Aspros.Node.Framework

> An independent, modular, TypeScript-first framework for maintainable Node.js applications.
>
> 一个独立、模块化、以 TypeScript 为核心的框架项目，用于构建可维护的 Node.js 应用。

## Project Status / 项目状态

The Domain baseline is established. Infrastructure now has an explicit resource lifecycle coordinator and a first Redis JSON cache adapter. Runtime and Redis integration verification remain pending.

Domain 首版基线已经建立。Infrastructure 已加入轻量生命周期协调器和首个 Redis JSON 缓存适配器；运行时与 Redis 集成验证仍待完成。

This project is designed independently, using [Aspros.Basic.Framework](https://github.com/aspros-luo/Aspros.Basic.Framework) as an architectural reference rather than mechanically translating its .NET implementation.

本项目独立设计，以 [Aspros.Basic.Framework](https://github.com/aspros-luo/Aspros.Basic.Framework) 作为架构参考，而不是机械翻译其 .NET 实现。

A capability is implemented only when working code, tests, and verification evidence exist. / 只有具备可运行代码、测试和验证证据的能力才视为已实现。

## Principles / 设计原则

- Practical DDD; avoid ceremony without business value. / 实用型 DDD，避免没有业务价值的形式主义。
- Domain owns domain semantics; outer layers own technical implementation. / Domain 负责领域语义，外层负责技术实现。
- Provide useful defaults without forcing inheritance or business modeling rules. / 提供便利默认实现，不强迫继承或业务建模规则。
- Type safety with runtime validation. / 类型安全与运行时校验并重。
- Evidence-based capability claims. / 能力声明必须有验证证据。
- Bilingual documentation and meaningful code comments. / 文档和有意义的代码注释采用中英双语。

## Packages / 模块

- `packages/domain` — domain kernel, repository and Unit of Work contracts. / 领域内核、Repository 和 Unit of Work 契约。
- `packages/infrastructure` — technical adapters and runtime integration. A provider-neutral lifecycle coordinator and a Redis JSON cache adapter are implemented; database production adapters, messaging and other providers remain pending. / 技术适配器与运行时集成层。已加入与供应商无关的生命周期协调器和 Redis JSON 缓存适配器；生产数据库、消息等 Provider 仍待实现。
- `packages/application` — planned use cases and orchestration, designed after required infrastructure capabilities are implemented and verified. / 计划中的应用用例与编排，待所需基础设施能力实现并验证后再设计。
- `packages/runtime-node` — planned Node.js-specific integrations. / 计划中的 Node.js 专属集成。
- `examples/` — later formal end-to-end microservice demos. / 后续正式端到端微服务 Demo。

## Architecture Delivery Order / 架构建设顺序

The intended build sequence follows the reference .NET framework: **Domain → Infrastructure → Application → Microservice Demo**. This is an implementation roadmap, not a reversal of dependency direction: Domain remains independent, infrastructure adapters implement inner-layer contracts, and the service host composes Application with Infrastructure.

本项目的建设顺序遵循参考 .NET 框架：**Domain → Infrastructure → Application → 微服务 Demo**。这是实施顺序，不代表依赖方向反转：Domain 保持独立，Infrastructure 适配器实现内层契约，最终由服务宿主组合 Application 与 Infrastructure。

Infrastructure foundations are built and validated before Application use cases are introduced. Application is then designed against proven capabilities rather than speculative adapters.

先建设并验证 Infrastructure 基础能力，再引入 Application。Application 应基于经过验证的能力设计，而不是围绕尚未实现的适配器进行猜测性设计。

## Domain Example / Domain 示例

The first Domain package includes a focused Trade / Order / Refund example under `packages/domain/examples/simple`. It demonstrates entity behavior, aggregate-root orchestration, domain errors and domain events. Persistence is intentionally outside this example and belongs to Infrastructure.

首版 Domain 在 `packages/domain/examples/simple` 中包含 Trade / Order / Refund 示例，用于展示实体行为、聚合根编排、领域错误和领域事件。示例刻意不包含持久化实现；持久化职责属于 Infrastructure。

## Workspace Commands / 工作区命令

- `pnpm install`
- `pnpm check` — type-checks Domain, Infrastructure and the active persistence POC; runs Domain, Infrastructure and POC unit tests; then builds the workspace packages. / 对 Domain、Infrastructure 和当前持久化 POC 执行类型检查；运行 Domain、Infrastructure 与 POC 单元测试；最后构建工作区 package。
- `pnpm poc:trade-mapping` — runs only the Trade mapper tests. / 仅运行 Trade Mapper 测试。
- `pnpm poc:trade-unit` — runs all fast POC unit tests, excluding MySQL integration. / 运行全部快速 POC 单元测试，不包含 MySQL 集成测试。
- `pnpm poc:trade-mysql` — explicitly runs the opt-in MySQL integration suite. / 显式运行可选 MySQL 集成测试。

The default check never requires a running MySQL server. External-service integration tests remain explicit opt-in commands so a developer's local environment cannot silently change the scope of the normal check.

默认检查不要求启动 MySQL 服务。外部服务集成测试保持为显式选择的命令，避免开发者本地环境悄悄改变常规检查范围。

## Documentation / 文档

- [Repository Structure / 仓库结构](docs/architecture/repository-structure.md)
- [Domain Design / Domain 设计](docs/architecture/domain-design.md)
- [Infrastructure Design / Infrastructure 设计](docs/architecture/infrastructure-design.md)
- [ADR-0001: Domain Runtime Portability / Domain 运行时可移植性](docs/architecture/decisions/ADR-0001-domain-runtime-portability.md)

## Engineering Standards / 工程规范

- TypeScript strict mode. / TypeScript 严格模式。
- No Node.js-specific dependencies in Domain. / Domain 不引入 Node.js 专属依赖。
- Tests cover normal behavior and failure paths. / 测试覆盖正常行为和失败路径。
- Performance claims require reproducible measurements. / 性能声明必须有可复现的实测依据。
- Planned, implemented, and verified capabilities are reported separately. / 分别说明计划中、已实现和已验证的能力。

## License / 许可证

License selection is pending confirmation; no license file has been added. / 许可证仍待确认，尚未添加许可证文件。
