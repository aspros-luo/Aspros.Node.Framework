import type { EntityManager } from "@mikro-orm/mysql";
import type { IUnitOfWork } from "../../../packages/domain/src/index.js";
import { MikroOrmTradeRepository } from "./trade-repository.js";

/** Lifecycle states for one isolated persistence context. / 单个隔离持久化上下文的生命周期状态。 */
type UnitOfWorkState = "active" | "committed" | "rolled-back" | "failed";

/**
 * Explicit transaction owner for the isolated Trade POC.
 * 独立 Trade POC 的显式事务所有者。
 *
 * A failed commit or rollback makes this Unit of Work unusable. Its identity map
 * is cleared; callers must create a new scope and reload aggregates.
 * Commit 或 Rollback 失败后，此 Unit of Work 不可继续使用，并会清空 Identity Map；
 * 调用方必须创建新的 Scope 并重新加载聚合。
 */
export class MikroOrmTradeUnitOfWork implements IUnitOfWork {
  private state: UnitOfWorkState = "active";

  public constructor(private readonly em: EntityManager) {}

  public async commit(): Promise<void> {
    this.assertActive();
    try {
      await this.em.commit();
      this.state = "committed";
    } catch (error) {
      this.state = "failed";
      if (this.em.isInTransaction()) {
        try {
          await this.em.rollback();
        } catch {
          // Preserve the original commit/flush error; the context is discarded below.
          // 保留原始 Commit/Flush 错误；下方会丢弃当前上下文。
        }
      }
      throw error;
    } finally {
      this.em.clear();
    }
  }

  public async rollback(): Promise<void> {
    this.assertActive();
    try {
      if (this.em.isInTransaction()) await this.em.rollback();
      this.state = "rolled-back";
    } catch (error) {
      this.state = "failed";
      throw error;
    } finally {
      this.em.clear();
    }
  }

  private assertActive(): void {
    if (this.state !== "active") {
      throw new Error(`Unit of Work is ${this.state} and cannot be used again.`);
    }
    if (!this.em.isInTransaction()) {
      this.state = "failed";
      this.em.clear();
      throw new Error("Unit of Work lost its transaction and cannot be used again.");
    }
  }
}

/** A scoped repository/UoW pair sharing one EntityManager and transaction. / 共享同一 EntityManager 与事务的 Scope。 */
export interface TradePersistenceScope {
  readonly entityManager: EntityManager;
  readonly tradeRepository: MikroOrmTradeRepository;
  readonly unitOfWork: MikroOrmTradeUnitOfWork;
}

/**
 * Create a fresh EntityManager and begin an owned top-level transaction.
 * 创建全新的 EntityManager，并开启由此 Scope 拥有的顶层事务。
 *
 * Nested/join-existing propagation is deliberately not implemented in this
 * first adapter. Passing a manager already inside a transaction is rejected
 * rather than accidentally creating an independent transaction.
 * 首版适配器刻意不实现嵌套/加入现有事务的传播语义。若传入的管理器已处于事务中，
 * 将直接拒绝，而不是意外创建独立事务。
 */
export async function createTradePersistenceScope(
  rootEntityManager: EntityManager,
): Promise<TradePersistenceScope> {
  if (rootEntityManager.isInTransaction()) {
    throw new Error("Cannot create a top-level Trade Unit of Work from an EntityManager already in a transaction.");
  }

  const em = rootEntityManager.fork({ clear: true });
  try {
    await em.begin();
  } catch (error) {
    em.clear();
    throw error;
  }

  const unitOfWork = new MikroOrmTradeUnitOfWork(em);
  return {
    entityManager: em,
    tradeRepository: new MikroOrmTradeRepository(em),
    unitOfWork,
  };
}
