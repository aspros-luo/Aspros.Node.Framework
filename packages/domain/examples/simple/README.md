# Simple Domain Example: Trade / Order / Refund

# 简单领域示例：Trade / Order / Refund

This example focuses on Domain behavior. It does not simulate persistence or transactions.

本示例只关注领域行为，不模拟持久化或事务。

- Trade is the aggregate root. / Trade 是聚合根。
- Order and Refund are entities with their own identities and behaviors. / Order、Refund 是拥有自身身份和行为的实体。
- Order exposes `confirm()`; Trade also offers `confirmOrder()` and `refundOrder()`. / Order 提供 `confirm()`；Trade 也提供 `confirmOrder()` 和 `refundOrder()`。
- IDs are supplied from outside the domain model. / ID 由领域模型外部提供。
- Repository and Unit of Work are contracts only; Infrastructure supplies their persistence implementations. / Repository 和 Unit of Work 在 Domain 中只定义契约；持久化实现由 Infrastructure 提供。

After installing dependencies, run from the repository root:

安装依赖后，在仓库根目录运行：

- `pnpm --filter @aspros/domain typecheck`
- `pnpm --filter @aspros/domain test`

This is not the later formal end-to-end demo. / 本示例不替代后续正式端到端 Demo。
