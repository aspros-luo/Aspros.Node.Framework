# Aspros.Node.Framework

> An independent, modular, TypeScript-first framework for maintainable Node.js applications.
>
> 一个独立、模块化、以 TypeScript 为核心的框架项目，用于构建可维护的 Node.js 应用。

## Project Status / 项目状态

**Domain first implementation in progress / Domain 首版实现阶段**

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
- `packages/infrastructure` — planned database, cache, messaging, analytics and runtime adapters. / 计划中的数据库、缓存、消息、分析存储和运行时适配器。
- `packages/application` — planned use cases and orchestration, designed after infrastructure capabilities and contracts are established. / 计划中的应用用例与编排，在基础设施能力和契约明确后设计。
- `packages/runtime-node` — planned Node.js-specific integrations. / 计划中的 Node.js 专属集成。
- `examples/` — later formal end-to-end microservice demos. / 后续正式端到端微服务 Demo。

## Architecture Delivery Order / 架构建设顺序

The intended build sequence follows the reference .NET framework: **Domain → Infrastructure → Application → Microservice Demo**. This is an implementation roadmap, not a reversal of dependency direction: Domain remains independent, infrastructure adapters implement inner-layer contracts, and the service host composes Application with Infrastructure.

本项目的建设顺序遵循参考 .NET 框架：**Domain → Infrastructure → Application → 微服务 Demo**。这是实施顺序，不代表依赖方向反转：Domain 保持独立，Infrastructure 适配器实现内层契约，最终由服务宿主组合 Application 与 Infrastructure。

Infrastructure foundations are built and validated before Application use cases are introduced. Application is then designed against proven capabilities rather than speculative adapters.

先建设并验证 Infrastructure 基础能力，再引入 Application 用例。Application 应基于经过验证的能力设计，而不是围绕尚未实现的适配器进行猜测性设计。

## Domain Example / Domain 示例

The first Domain package includes a focused Trade / Order / Refund example under `packages/domain/examples/simple`. It demonstrates contracts and domain behavior; its in-memory adapters are not production infrastructure.

首版 Domain 在 `packages/domain/examples/simple` 中包含 Trade / Order / Refund 示例，用于展示契约和领域行为；其中的内存适配器不是生产级基础设施。

## Workspace Commands / 工作区命令

- `pnpm install`
- `pnpm check`

## Documentation / 文档

- [Repository Structure / 仓库结构](docs/architecture/repository-structure.md)
- [Domain Design / Domain 设计](docs/architecture/domain-design.md)
- [ADR-0001: Domain Runtime Portability / Domain 运行时可移植性](docs/architecture/decisions/ADR-0001-domain-runtime-portability.md)

## Engineering Standards / 工程规范

- TypeScript strict mode. / TypeScript 严格模式。
- No Node.js-specific dependencies in Domain. / Domain 不引入 Node.js 专属依赖。
- Tests cover normal behavior and failure paths. / 测试覆盖正常行为和失败路径。
- Performance claims require reproducible measurements. / 性能声明必须有可复现的实测依据。
- Planned, implemented, and verified capabilities are reported separately. / 分别说明计划中、已实现和已验证的能力。

## License / 许可证

License selection is pending confirmation; no license file has been added. / 许可证仍待确认，尚未添加许可证文件。
