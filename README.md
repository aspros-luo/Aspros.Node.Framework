# Aspros.Node.Framework

> An independent, modular, TypeScript-first framework for maintainable Node.js applications.
>
> 一个独立、模块化、以 TypeScript 为核心的框架项目，用于构建可维护的 Node.js 应用。

## Project Status / 项目状态

**Architecture design / 架构设计阶段**

This project is designed independently, using the architectural ideas of [Aspros.Basic.Framework](https://github.com/aspros-luo/Aspros.Basic.Framework) as reference material rather than mechanically translating its .NET implementation.

本项目独立设计，以 [Aspros.Basic.Framework](https://github.com/aspros-luo/Aspros.Basic.Framework) 的架构思想作为参考，而不是机械翻译其 .NET 实现。

No capability is considered implemented until working code, automated tests, and verification evidence exist.

任何能力都必须具备可运行代码、自动化测试和验证证据，才会被视为已实现。

## Principles / 设计原则

- Practical DDD / 实用型领域驱动设计：模型解决实际业务问题，避免形式主义。
- Explicit boundaries / 明确边界：Domain 不依赖基础设施和交付机制。
- Composition over mandatory inheritance / 优先组合而非强制继承：提供默认实现，但不强迫业务模型继承框架基类。
- Type safety with runtime validation / 类型安全与运行时验证并重：TypeScript 类型不能替代外部输入校验。
- Evidence-based claims / 以验证证据为准：区分已实现、模拟、计划中和已验证的能力。
- Bilingual documentation / 双语文档：项目文档和有意义的代码注释均采用中英双语。

## Planned Repository Areas / 计划中的仓库模块

The repository is planned as a pnpm workspace monorepo. Start with Domain; add other packages only after their responsibilities and dependency boundaries are designed.

仓库计划采用 pnpm workspace 多包结构。先从 Domain 开始；其他模块只有在职责和依赖边界明确后才逐步引入。

- `packages/domain` — domain kernel and abstractions / 领域内核与抽象
- `packages/application` — use cases and orchestration / 应用用例与编排
- `packages/infrastructure` — persistence and external adapters / 持久化与外部适配器
- `packages/runtime-node` — Node.js-specific integrations / Node.js 专属集成
- `examples/` — runnable examples / 可运行示例
- `docs/` — architecture decisions and guides / 架构决策与指南

The exact package graph is governed by architecture documents, not this overview.

具体 package 依赖关系以架构文档为准。

## Documentation / 文档入口

- [Repository Structure / 仓库结构](docs/architecture/repository-structure.md)
- [Domain Design / Domain 设计](docs/architecture/domain-design.md)
- [ADR-0001: Domain Runtime Portability / Domain 运行时可移植性](docs/architecture/decisions/ADR-0001-domain-runtime-portability.md)

## Engineering Standards / 工程规范

- TypeScript strict mode is the baseline. / 默认启用 TypeScript 严格模式。
- Public APIs and meaningful comments are bilingual. / 公共 API 和有意义的注释均为中英双语。
- Tests cover normal behavior, edge cases, and failures. / 测试覆盖正常行为、边界情况和失败路径。
- Runtime-specific APIs stay in runtime-specific packages. / Runtime 专属 API 限制在对应模块。
- Performance claims require reproducible measurements of real implementations. / 性能数据必须来自真实实现的可复现实测。

## License / 许可证

License selection is pending confirmation; no license file has been added.

许可证选择仍待确认，当前尚未添加许可证文件。
