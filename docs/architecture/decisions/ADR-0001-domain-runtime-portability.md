# ADR-0001: Domain Runtime Portability / Domain 运行时可移植性

- **Status / 状态：Accepted as design direction / 已接受为设计方向**
- **Date / 日期：2026-11-13**
- **Scope / 范围：`packages/domain`**

## Context / 背景

The framework primarily targets Node.js, but domain rules should not be coupled to Node.js APIs. A portable Domain package improves testability and reuse in other JavaScript runtimes without promising that every framework integration supports those runtimes.

框架首要面向 Node.js，但领域规则不应与 Node.js API 耦合。可移植的 Domain package 能提升可测试性，并允许在其他 JavaScript Runtime 中复用；这不意味着框架所有集成都必须支持其他 Runtime。

## Decision / 决策

The Domain package avoids Node.js-specific APIs and runtime-specific dependencies.

Domain package 不使用 Node.js 专属 API，也不引入运行时专属依赖。

The overall framework remains Node.js-first. Node.js-specific capabilities belong in dedicated runtime packages or infrastructure adapters.

整个框架仍以 Node.js 为首要目标。Node.js 专属能力放在独立运行时 package 或基础设施适配器中。

Domain receives identifiers, timestamps, and other environment-dependent values through explicit inputs or small injected abstractions, not by directly reading global/runtime APIs.

Domain 通过显式参数或轻量注入抽象获取标识符、时间戳及其他依赖环境的值，而不是直接读取全局对象或 Runtime API。

## Consequences / 影响

Positive / 正面影响：

- Domain tests do not require Node.js-specific setup. / Domain 测试不需要 Node.js 专属环境准备。
- Domain can be reused across compatible JavaScript runtimes. / Domain 可在兼容的 JavaScript Runtime 之间复用。
- Runtime-specific concerns have an explicit architectural home. / Runtime 专属问题拥有明确的架构归属。

Trade-offs / 代价：

- Values that could otherwise be read from runtime globals must be passed in or injected. / 原本可从 Runtime 全局对象读取的值需要显式传入或注入。
- Domain portability does not guarantee portability of Infrastructure or the complete framework. / Domain 可移植不代表 Infrastructure 或整个框架也具备同等可移植性。

## Guardrails / 约束

- No direct Node.js built-in imports in `packages/domain`. / `packages/domain` 不得直接导入 Node.js 内置模块。
- Review transitive dependencies for runtime-specific APIs. / 检查传递依赖是否使用运行时专属 API。
- Keep Node.js adapters in `packages/runtime-node` or an appropriate infrastructure package. / Node.js 适配器放入 `packages/runtime-node` 或合适的基础设施 package。
