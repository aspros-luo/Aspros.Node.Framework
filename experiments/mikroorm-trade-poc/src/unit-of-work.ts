import type { EntityManager } from "@mikro-orm/mysql";
import type { IUnitOfWork } from "../../../packages/domain/src/index.js";
import { Trade } from "../../../packages/domain/examples/simple/trade.js";
import { MikroOrmTradeRepository } from "./trade-repository.js";
import { MikroOrmTradePersistenceWriter } from "./trade-persistence-writer.js";

type ChangeKind = "new" | "dirty" | "deleted";
type UnitOfWorkState =
  | "active"
  | "starting-transaction"
  | "committing"
  | "rolling-back"
  | "committed"
  | "rolled-back"
  | "failed";

interface RegisteredChange {
  readonly aggregate: Trade;
  kind: ChangeKind;
}

/**
 * One isolated, sequential persistence context with opt-in transaction ownership.
 * 一个隔离且顺序执行的持久化上下文，事务由调用方选择性开启。
 *
 * Register only records intent. Commit maps and flushes all changes. Overlapping lifecycle
 * operations are rejected; concurrent requests/jobs must use separate scopes.
 * Register 只登记意图；Commit 才映射并 Flush 全部变更。重叠的生命周期操作会被拒绝；
 * 并发请求/任务必须使用不同 Scope。
 */
export class MikroOrmTradeUnitOfWork implements IUnitOfWork {
  private state: UnitOfWorkState = "active";
  private readonly changes = new Map<number, RegisteredChange>();
  private ownsTransaction = false;
  private readonly writer: MikroOrmTradePersistenceWriter;

  public constructor(private readonly em: EntityManager) {
    this.writer = new MikroOrmTradePersistenceWriter(em);
  }

  public get hasActiveTransaction(): boolean {
    return this.ownsTransaction && this.em.isInTransaction();
  }

  public registerNew<TEntity>(entity: TEntity): void {
    this.register(entity, "new");
  }

  public registerDirty<TEntity>(entity: TEntity): void {
    this.register(entity, "dirty");
  }

  public registerDeleted<TEntity>(entity: TEntity): void {
    this.register(entity, "deleted");
  }

  public async beginTransaction(): Promise<void> {
    this.assertActive();
    if (this.ownsTransaction && this.em.isInTransaction()) return;
    if (this.em.isInTransaction()) {
      throw new Error("The EntityManager is already in a transaction not owned by this Unit of Work.");
    }

    this.state = "starting-transaction";
    try {
      await this.em.begin();
      this.ownsTransaction = true;
      this.state = "active";
    } catch (error) {
      if (this.em.isInTransaction()) {
        try {
          await this.em.rollback();
        } catch {
          // Preserve the original transaction-start error.
        }
      }
      this.state = "failed";
      this.changes.clear();
      this.em.clear();
      throw error;
    }
  }

  public async commit(): Promise<void> {
    this.assertActive();
    this.state = "committing";
    try {
      for (const change of this.changes.values()) {
        if (change.kind === "new") await this.writer.persistNew(change.aggregate);
        else if (change.kind === "dirty") await this.writer.persistDirty(change.aggregate);
        else await this.writer.persistDeleted(change.aggregate);
      }

      // This is the only point where registered Domain changes reach the database.
      // 只有在此处，已登记的领域变更才会真正写入数据库。
      await this.em.flush();

      if (this.ownsTransaction && this.em.isInTransaction()) {
        await this.em.commit();
      }
      this.state = "committed";
    } catch (error) {
      this.state = "failed";
      if (this.ownsTransaction && this.em.isInTransaction()) {
        try {
          await this.em.rollback();
        } catch {
          // Preserve the original persistence error.
          // 保留原始持久化错误。
        }
      }
      throw error;
    } finally {
      this.changes.clear();
      this.em.clear();
    }
  }

  public async rollback(): Promise<void> {
    this.assertActive();
    this.state = "rolling-back";
    try {
      if (this.ownsTransaction && this.em.isInTransaction()) {
        await this.em.rollback();
      }
      this.state = "rolled-back";
    } catch (error) {
      this.state = "failed";
      throw error;
    } finally {
      this.changes.clear();
      this.em.clear();
    }
  }

  private register<TEntity>(entity: TEntity, kind: ChangeKind): void {
    this.assertActive();
    if (!(entity instanceof Trade)) {
      throw new TypeError("The Trade POC Unit of Work accepts Trade aggregate instances only.");
    }

    const aggregate = entity;
    const existing = this.changes.get(aggregate.id);
    if (!existing) {
      this.changes.set(aggregate.id, { aggregate, kind });
      return;
    }
    if (existing.aggregate !== aggregate) {
      throw new Error(`A different Trade instance with id ${aggregate.id} is already registered.`);
    }

    // Normalize registration transitions while preserving aggregate lifecycle intent.
    // 合并登记状态时保留聚合生命周期意图。
    if (existing.kind === "new") {
      if (kind === "deleted") this.changes.delete(aggregate.id);
      return;
    }
    if (existing.kind === "deleted") {
      if (kind !== "deleted") {
        throw new Error(`Trade ${aggregate.id} is already registered for deletion.`);
      }
      return;
    }
    if (kind === "deleted") existing.kind = "deleted";
    // Dirty followed by New remains Dirty; it must not become an insert.
    // Dirty 后再次登记 New 仍保持 Dirty，不能错误地变成新增。
  }

  private assertActive(): void {
    if (this.state !== "active") {
      throw new Error(`Unit of Work is ${this.state} and cannot be used again.`);
    }
    if (this.ownsTransaction && !this.em.isInTransaction()) {
      this.state = "failed";
      this.em.clear();
      throw new Error("Unit of Work lost its explicit transaction and cannot be used again.");
    }
  }
}

/** A query repository and Unit of Work sharing one forked EntityManager. / 共享同一个 Fork EntityManager 的查询仓储与工作单元。 */
export interface TradePersistenceScope {
  readonly tradeRepository: MikroOrmTradeRepository;
  readonly unitOfWork: MikroOrmTradeUnitOfWork;
}

/**
 * Create a fresh EntityManager without opening a transaction.
 * 创建全新的 EntityManager，但不自动开启事务。
 */
export async function createTradePersistenceScope(
  rootEntityManager: EntityManager,
): Promise<TradePersistenceScope> {
  if (rootEntityManager.isInTransaction()) {
    throw new Error("Cannot create a Trade Unit of Work from an EntityManager already in a transaction.");
  }

  const em = rootEntityManager.fork({ clear: true });
  const unitOfWork = new MikroOrmTradeUnitOfWork(em);
  return {
    tradeRepository: new MikroOrmTradeRepository(em),
    unitOfWork,
  };
}
