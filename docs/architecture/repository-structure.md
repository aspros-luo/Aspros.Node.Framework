# Repository Structure / 仓库结构

**Status / 状态：Domain workspace scaffold established; outer packages planned / Domain 工作区骨架已建立；外层模块仍在规划中**

## 1. Repository Shape / 仓库整体结构

The repository uses a pnpm workspace. Domain is the first package to be implemented; other packages are added only after their boundaries are designed.

仓库采用 pnpm workspace。Domain 是首个实现的 package；其他 package 在职责边界明确后再逐步建立。

```text
Aspros.Node.Framework/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── docs/architecture/
└── packages/
    ├── domain/
    │   ├── src/
    │   │   ├── entities/
    │   │   ├── repositories/
    │   │   ├── uow/
    │   │   ├── events/
    │   │   ├── errors/
    │   │   ├── services/
    │   │   ├── specifications/
    │   │   └── index.ts
    │   ├── examples/simple/
    │   ├── tests/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsconfig.all.json
    │   └── README.md
    ├── application/       # planned / 计划中
    ├── infrastructure/    # planned / 计划中
    └── runtime-node/      # planned / 计划中
```

## 2. Domain Directory Responsibilities / Domain 目录职责

- `entities/`: Entity identity, aggregate-root role and optional base classes. / 实体身份、聚合根角色和可选基类。
- `repositories/`: persistence-neutral aggregate repository contracts. / 与持久化技术无关的聚合仓储契约。
- `uow/`: Unit of Work contract only; no transaction implementation. / 仅定义工作单元契约，不实现事务。
- `events/`: domain event contracts and metadata. / 领域事件契约与元数据。
- `errors/`: typed domain errors and stable codes. / 类型化领域错误与稳定代码。
- `services/`: domain service marker/contracts. / 领域服务标记与契约。
- `specifications/`: reusable in-memory domain predicates. / 可复用的内存领域判断条件。
- `examples/simple/`: a small Trade / Order / Refund usage example. / Trade / Order / Refund 小型用法示例。
- `tests/`: package behavior tests, including example behavior. / package 行为测试，包括示例行为。

The requested `entities`, `repositories`, and `uow` folders are first-class parts of Domain. Examples are kept separate from the public source entry point and are not exported as framework APIs.

用户指定的 `entities`、`repositories` 和 `uow` 是 Domain 的正式目录。示例与公共源码入口分离，不作为框架 API 导出。

## 3. Layer Responsibilities / 分层职责

### Domain

Owns domain building blocks and contracts. It has no dependency on other framework packages, databases, HTTP frameworks, message brokers, or Node.js APIs.

负责领域构件和契约。不依赖其他框架 package、数据库、HTTP 框架、消息代理或 Node.js API。

### Application (planned) / Application（计划中）

Owns use cases, orchestration, authorization flow, and application-level transaction coordination. It depends on Domain contracts.

负责用例、编排、授权流程和应用级事务协调，依赖 Domain 契约。

### Infrastructure (planned) / Infrastructure（计划中）

Implements persistence, external service, messaging and technical adapters required by inner layers. It must not own domain rules.

实现内层需要的持久化、外部服务、消息和技术适配器，不拥有领域规则。

### Runtime Node (planned) / Node Runtime（计划中）

Contains capabilities that genuinely require Node.js APIs.

包含确实需要 Node.js API 的能力。

## 4. Dependency Direction / 依赖方向

```text
Application ───────> Domain <────── Infrastructure adapters
                          ^
                          |
                     Runtime Node
```

This is a responsibility sketch, not a complete import graph. An adapter depends on the port it implements; Domain never imports an adapter.

这是职责示意图，不是完整 import 图。适配器依赖其实现的端口；Domain 永远不导入适配器。

## 5. Tooling Baseline / 工具基线

| Concern / 事项 | Current choice / 当前选择 |
|---|---|
| Workspace / 工作区 | pnpm |
| Language / 语言 | TypeScript |
| Module format / 模块格式 | ESM |
| Type checking / 类型检查 | strict TypeScript |
| Tests / 测试 | Vitest |
| Domain target / Domain 编译目标 | ES2022 |
| Workspace Node baseline / 工作区 Node 基线 | Node.js 22+ |

The workspace baseline is a development/tooling baseline, not a claim that Domain uses Node.js APIs. Revisit it when the package support policy is finalized.

工作区基线用于开发和工具链，不代表 Domain 使用 Node.js API。正式确定 package 支持策略时再复核。

## 6. Delivery Order / 推进顺序

1. Implement and validate Domain. / 实现并验证 Domain。
2. Design Application around real use cases and transaction coordination. / 围绕真实用例和事务协调设计 Application。
3. Implement Infrastructure adapters against stable contracts. / 基于稳定契约实现 Infrastructure 适配器。
4. Add Node.js runtime integrations. / 增加 Node.js Runtime 集成。
5. Build a formal end-to-end demo and integration tests. / 建立正式端到端 Demo 和集成测试。
