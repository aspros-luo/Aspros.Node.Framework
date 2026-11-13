# Simple Domain Example: Trade / Order / Refund

# 简单领域示例：Trade / Order / Refund

This is one illustrative business model, not a mandatory aggregate design.

本示例展示一种业务模型，不是强制采用的聚合设计。

- Trade is the aggregate root. / Trade 是聚合根。
- Order and Refund are entities with their own identities and behaviors. / Order、Refund 是拥有自身身份和行为的实体。
- Order exposes confirm(); Trade also offers confirmOrder() and refundOrder(). / Order 提供 confirm()；Trade 也提供 confirmOrder() 和 refundOrder()。
- IDs are supplied from outside the domain model. / ID 由领域模型外部提供。
- Repository and Unit of Work are contracts. The in-memory implementations are demonstration-only, not production transactions. / Repository 和 Unit of Work 是契约；内存实现仅用于演示，不是真实生产事务。

After installing dependencies, run from the repository root:

安装依赖后，在仓库根目录运行：

- pnpm --filter @aspros/domain typecheck
- pnpm --filter @aspros/domain test

This is not the later formal end-to-end demo. / 本示例不替代后续正式端到端 Demo。
