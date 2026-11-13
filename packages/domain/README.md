# @aspros/domain

A runtime-portable domain kernel and domain-facing contracts for Practical DDD.

面向实用型 DDD 的跨 Runtime 领域内核与领域契约。

## Scope / 职责

- Entity identity and optional aggregate-root base classes. / Entity 身份与可选聚合根基类。
- Domain event and domain error primitives. / 领域事件与领域错误基础构件。
- Aggregate repository and Unit of Work contracts. / 聚合仓储与工作单元契约。
- Domain service and specification abstractions. / 领域服务与规约抽象。

This package does not implement persistence, transactions, messaging, HTTP, or runtime adapters.

本 package 不实现持久化、事务、消息投递、HTTP 或 Runtime 适配器。

## Examples / 示例

See [the Trade / Order / Refund example](./examples/simple/README.md).

参见 [Trade / Order / Refund 示例](./examples/simple/README.md)。

## Commands / 命令

Run from the repository root after installing workspace dependencies:

安装工作区依赖后，在仓库根目录运行：

- `pnpm --filter @aspros/domain typecheck`
- `pnpm --filter @aspros/domain test`
- `pnpm --filter @aspros/domain build`
