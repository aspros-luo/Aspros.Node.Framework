# Repository Structure / 仓库结构

**Status / 状态：Proposed baseline / 初始提案**

This document describes the intended architecture. It does not claim that all packages already exist.

本文描述计划采用的架构，不代表所有 package 已经创建。

## 1. Repository Shape / 仓库整体形态

The repository is planned as a pnpm workspace monorepo. Related packages can be versioned and tested together while keeping package-level dependency boundaries.

仓库计划采用 pnpm workspace 多包结构。相关模块可以统一版本管理和测试，同时保持 package 级别的依赖边界。

```text
Aspros.Node.Framework/
├── README.md
├── package.json                  # Root scripts and workspace metadata / 根脚本与工作区元数据
├── pnpm-workspace.yaml           # Workspace declaration / 工作区声明
├── tsconfig.base.json            # Shared TypeScript defaults / TypeScript 共享配置
├── .gitignore
├── docs/
│   ├── architecture/
│   │   ├── repository-structure.md
│   │   ├── domain-design.md
│   │   └── decisions/
│   │       └── ADR-0001-domain-runtime-portability.md
│   ├── guides/
│   └── reference/
├── packages/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── runtime-node/
├── examples/
│   ├── minimal-domain/
│   └── service-api/
└── tools/
```

This is a target structure, not a mandate to create empty packages now. Add a package only when it has a clear responsibility, public contract, and testable value.

这是目标结构，不要求现在立即创建所有空 package。只有当模块具有清晰职责、公共契约和可测试价值时，才创建它。

## 2. Package Responsibilities / 模块职责

### `packages/domain`

Contains domain-modeling building blocks and domain-facing contracts: Entity, Value Object, Aggregate Root, Domain Event, Domain Error, Repository contract, Domain Service, and optional Specification.

包含领域建模基础构件和面向领域的契约：Entity、Value Object、Aggregate Root、Domain Event、Domain Error、Repository 契约、Domain Service，以及可选的 Specification。

**Must not depend on / 不得依赖：** Node.js built-in modules, HTTP frameworks, databases, ORM packages, message brokers, DI containers, or other framework packages.

### `packages/application`

Owns application use cases and coordinates domain objects with ports. It defines use-case transaction boundaries and coordinates commit/rollback and post-commit work.

负责应用用例，并通过端口协调领域对象。它定义用例级事务边界，并协调提交、回滚和提交后的工作。

Application may depend on Domain; Domain must never depend on Application.

Application 可以依赖 Domain；Domain 绝不能反向依赖 Application。

### `packages/infrastructure`

Implements technical adapters such as database persistence, ORM integration, message transport, cache, and external services.

实现数据库持久化、ORM 集成、消息传输、缓存和外部服务等技术适配器。

Infrastructure implements contracts required by inner layers; it does not own domain rules.

Infrastructure 实现内层所需的契约，但不拥有领域规则。

### `packages/runtime-node`

Contains integrations that genuinely require Node.js APIs, such as Node-specific filesystem, process, crypto, or runtime lifecycle adapters.

包含确实需要 Node.js API 的集成，例如 Node 专属文件系统、进程、加密或运行时生命周期适配器。

Node-specific dependencies must not leak into the portable Domain package.

Node 专属依赖不得渗透到可移植的 Domain package 中。

## 3. Dependency Direction / 依赖方向

```text
runtime-node ─────┐
infrastructure ──┼──> application ───> domain
examples ─────────┘
```

This is a conceptual direction, not a final package graph. Concrete adapters implement abstractions owned by inner layers.

这是概念性依赖方向，不是最终 package 依赖图。具体适配器实现由内层拥有的抽象。

Rules / 规则：

1. Domain is the innermost package and has no framework-package dependencies. / Domain 位于最内层，不依赖其他框架 package。
2. Application depends on Domain abstractions, not concrete database or transport implementations. / Application 依赖 Domain 抽象，不依赖具体数据库或传输实现。
3. Infrastructure implements ports required by inner layers. / Infrastructure 实现内层需要的端口。
4. Runtime-specific code stays in runtime-specific packages. / Runtime 专属代码隔离在对应模块。
5. Examples consume supported public APIs and must not become hidden implementation dependencies. / 示例使用受支持的公共 API，不得成为隐藏的实现依赖。

## 4. Workspace and Tooling / 工作区与工具选型

| Concern / 事项 | Direction / 当前方向 | Status / 状态 |
|---|---|---|
| Package manager / 包管理器 | pnpm workspaces | Proposed / 提案 |
| Language / 语言 | TypeScript | Agreed / 已确定 |
| Type checking / 类型检查 | TypeScript strict mode | Baseline / 基线 |
| Module format / 模块格式 | Review ESM-first and compatibility needs | Open / 待定 |
| Test runner / 测试运行器 | Select before implementation | Open / 待定 |
| Build tool / 构建工具 | Keep minimal; decide based on publishing needs | Open / 待定 |
| Node.js support range / Node.js 支持范围 | Define before runtime integration | Open / 待定 |
| License / 许可证 | Add only after explicit confirmation | Open / 待定 |

Do not add dependencies merely because they are popular. Each dependency needs an identified responsibility and compatibility rationale.

不要仅因依赖流行就引入它。每项依赖都必须有明确职责和兼容性依据。

## 5. Package Layout Convention / Package 内部约定

A package should remain small and predictable. A possible layout is:

每个 package 应保持精简且结构可预测。可采用：

```text
packages/<package-name>/
├── src/
│   ├── index.ts                 # Public exports / 公共导出
│   └── ...
├── tests/
├── package.json
├── tsconfig.json
└── README.md                    # Package usage and boundaries / 模块用法与边界
```

Do not create deep folder hierarchies before the code needs them. Public exports must be intentional; internal files do not automatically become public API.

不要在代码尚不需要时提前创建过深目录。公共导出必须经过明确选择，内部文件不会自动成为公共 API。

## 6. Delivery Order / 推进顺序

1. Finalize Domain boundaries and design. / 完成 Domain 边界与设计定稿。
2. Implement and validate Domain. / 实现并验证 Domain。
3. Design Application around real use cases and transaction orchestration. / 围绕真实用例和事务编排设计 Application。
4. Design Infrastructure adapters against stable inner-layer contracts. / 基于稳定的内层契约设计 Infrastructure 适配器。
5. Add Node.js runtime integrations where required. / 在确有需要时增加 Node.js 运行时集成。
6. Add end-to-end examples and integration tests. / 建立端到端示例和集成测试。

The order may change when evidence invalidates an assumption. Architecture is a constraint system, not a fixed ceremony.

如果验证证据推翻某项假设，可以调整顺序。架构是约束体系，而不是僵化仪式。
