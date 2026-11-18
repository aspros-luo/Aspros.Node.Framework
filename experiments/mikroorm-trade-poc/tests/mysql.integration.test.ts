import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Order, Refund, Trade } from "../../../packages/domain/examples/simple/trade.js";
import { createTradePocOrm } from "../src/bootstrap.js";
import { applyTradePocMigrations, getTradePocMigrationStatus } from "../src/migration-runner.js";
import { createTradePersistenceScope } from "../src/unit-of-work.js";
import { TradeMapper } from "../src/trade-mapper.js";
import { OrderRecord, RefundRecord, TradeRecord } from "../src/records.js";

interface PocAuditDatabase {
  poc_audit: { id: number; trade_id: number; message: string };
}

const clientUrl = process.env.MYSQL_POC_DATABASE_URL;

describe.skipIf(!clientUrl)("MikroORM MySQL Trade persistence", () => {
  let migrationResultPromise: ReturnType<typeof applyTradePocMigrations> | undefined;
  let ormPromise: ReturnType<typeof createTradePocOrm> | undefined;

  const getMigrationResult = () => {
    migrationResultPromise ??= applyTradePocMigrations({ clientUrl: clientUrl! });
    return migrationResultPromise;
  };

  const getOrm = () => {
    ormPromise ??= getMigrationResult().then(() =>
      createTradePocOrm({ clientUrl: clientUrl! }),
    );
    return ormPromise;
  };

  it("keeps status read-only and applies the versioned schema migration", async () => {
    const probe = await createTradePocOrm({ clientUrl: clientUrl! });
    try {
      const beforeRows = (await probe.em.getConnection().execute(
        `SELECT TABLE_NAME AS tableName
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?`,
        ["poc_schema_migrations"],
        "all",
      )) as Array<{ tableName: string }>;

      const status = await getTradePocMigrationStatus({ clientUrl: clientUrl! });

      const afterRows = (await probe.em.getConnection().execute(
        `SELECT TABLE_NAME AS tableName
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?`,
        ["poc_schema_migrations"],
        "all",
      )) as Array<{ tableName: string }>;

      expect(status.historyTableExists).toBe(beforeRows.length > 0);
      expect(afterRows.length).toBe(beforeRows.length);
      expect(status.historyTableExists).toBe(afterRows.length > 0);
    } finally {
      await probe.close(true);
    }

    const result = await getMigrationResult();
    expect(result.executed).toContain("Migration20261117000100_CreateTradePocSchema");
    expect(result.pending).toHaveLength(0);
    expect(result.schemaState).toBe("applied");
  });

  afterAll(async () => {
    if (ormPromise) {
      const orm = await getOrm();
      await orm.close(true);
    }
  });

  it("persists and reloads a complete aggregate in a fresh EntityManager", async () => {
    const orm = await getOrm();
    const idBase = randomInt(100, 1_000_000_000);
    const tradeId = idBase;
    const pendingOrderId = idBase + 1;
    const refundedOrderId = idBase + 2;
    const refundId = idBase + 3;

    const pendingOrder = new Order(pendingOrderId, "Keyboard", 2, 4500);
    const refundedOrder = new Order(refundedOrderId, "Mouse", 1, 2500);
    refundedOrder.confirm();
    refundedOrder.markRefunded();

    const aggregate = new Trade(tradeId, [pendingOrder, refundedOrder], [
      new Refund(refundId, refundedOrderId, 2500, "Customer request"),
    ]);
    const snapshot = TradeMapper.toPersistence(aggregate);
    const writer = orm.em.fork({ clear: true });

    try {
      writer.persist(snapshot.trade);
      for (const order of snapshot.orders) writer.persist(order);
      for (const refund of snapshot.refunds) writer.persist(refund);
      await writer.flush();

      // A fresh identity map proves the result comes from MySQL, not the writer's managed objects.
      // 使用全新的 Identity Map，确保结果来自 MySQL，而不是写入上下文中的托管对象。
      const reader = orm.em.fork({ clear: true });
      try {
        const tradeRecord = await reader.findOneOrFail(TradeRecord, { id: tradeId });
        const orders = await reader.find(OrderRecord, { trade: tradeId });
        const refunds = await reader.find(
          RefundRecord,
          { trade: tradeId },
          { populate: ["trade", "order", "order.trade"] },
        );

        const restored = TradeMapper.toDomain({
          trade: tradeRecord,
          orders,
          refunds,
        });

        expect(restored.id).toBe(tradeId);
        expect(restored.orders.map((order) => order.status).sort()).toEqual([
          "pending",
          "refunded",
        ]);
        expect(restored.refunds).toHaveLength(1);
        expect(restored.domainEvents).toHaveLength(0);
      } finally {
        reader.clear();
      }
    } finally {
      // Remove only rows created by this test, in FK-safe order.
      // 只删除本测试创建的记录，并遵守外键依赖顺序。
      const cleanup = orm.em.fork({ clear: true });
      try {
        await cleanup.nativeDelete(RefundRecord, { trade: tradeId });
        await cleanup.nativeDelete(OrderRecord, { trade: tradeId });
        await cleanup.nativeDelete(TradeRecord, { id: tradeId });
      } finally {
        cleanup.clear();
        writer.clear();
      }
    }
  });

  it("saves and reloads through the Repository and Unit of Work adapters", async () => {
    const orm = await getOrm();
    const idBase = randomInt(100, 1_000_000_000);
    const tradeId = idBase;
    const orderId = idBase + 1;
    const refundId = idBase + 2;
    const order = new Order(orderId, "Trackpad", 1, 7200);
    order.confirm();
    order.markRefunded();
    const aggregate = new Trade(
      tradeId,
      [order],
      [new Refund(refundId, orderId, 7200, "Adapter integration")],
    );

    try {
      const writeScope = await createTradePersistenceScope(orm.em);
      expect(writeScope.unitOfWork.hasActiveTransaction).toBe(false);
      writeScope.unitOfWork.registerNew(aggregate);
      // Registration is memory-only: the aggregate is not queryable before Commit.
      // Register 仅在内存中登记：Commit 前无法查询到该聚合。
      expect(await writeScope.tradeRepository.findById(tradeId)).toBeNull();
      expect(writeScope.unitOfWork.hasActiveTransaction).toBe(false);
      await writeScope.unitOfWork.commit();

      const readScope = await createTradePersistenceScope(orm.em);
      try {
        const restored = await readScope.tradeRepository.findById(tradeId);
        expect(restored).not.toBeNull();
        expect(restored?.orders[0]?.status).toBe("refunded");
        expect(restored?.refunds).toHaveLength(1);
        await readScope.unitOfWork.rollback();
      } catch (error) {
        try { await readScope.unitOfWork.rollback(); } catch { /* Scope is already closed. */ }
        throw error;
      }
    } finally {
      const cleanup = orm.em.fork({ clear: true });
      try {
        await cleanup.nativeDelete(RefundRecord, { trade: tradeId });
        await cleanup.nativeDelete(OrderRecord, { trade: tradeId });
        await cleanup.nativeDelete(TradeRecord, { id: tradeId });
      } finally {
        cleanup.clear();
      }
    }
  });


  it("deletes an aggregate only when Unit of Work commits a registered deletion", async () => {
    const orm = await getOrm();
    const idBase = randomInt(100, 1_000_000_000);
    const tradeId = idBase;
    const orderId = idBase + 1;

    const createScope = await createTradePersistenceScope(orm.em);
    createScope.unitOfWork.registerNew(
      new Trade(tradeId, [new Order(orderId, "Portable SSD", 1, 12900)]),
    );
    await createScope.unitOfWork.commit();

    const deleteScope = await createTradePersistenceScope(orm.em);
    try {
      const aggregate = await deleteScope.tradeRepository.findById(tradeId);
      expect(aggregate).not.toBeNull();
      deleteScope.unitOfWork.registerDeleted(aggregate!);
      expect(await deleteScope.tradeRepository.findById(tradeId)).not.toBeNull();
      await deleteScope.unitOfWork.commit();
    } finally {
      const cleanup = orm.em.fork({ clear: true });
      try {
        await cleanup.nativeDelete(RefundRecord, { trade: tradeId });
        await cleanup.nativeDelete(OrderRecord, { trade: tradeId });
        await cleanup.nativeDelete(TradeRecord, { id: tradeId });
      } finally {
        cleanup.clear();
      }
    }

    const verifier = orm.em.fork({ clear: true });
    try {
      expect(await verifier.count(TradeRecord, { id: tradeId })).toBe(0);
      expect(await verifier.count(OrderRecord, { trade: tradeId })).toBe(0);
      expect(await verifier.count(RefundRecord, { trade: tradeId })).toBe(0);
    } finally {
      verifier.clear();
    }
  });

  it("discards registered changes and rolls back explicit SQL work", async () => {
    const orm = await getOrm();
    const idBase = randomInt(100, 1_000_000_000);
    const tradeId = idBase;
    const orderId = idBase + 1;
    const auditId = idBase + 2;
    const aggregate = new Trade(
      tradeId,
      [new Order(orderId, "USB Hub", 1, 1800)],
    );
    const scope = await createTradePersistenceScope(orm.em);

    try {
      await scope.unitOfWork.beginTransaction();
      scope.unitOfWork.registerNew(aggregate);
      await scope.entityManager
        .getKysely<PocAuditDatabase>()
        .insertInto("poc_audit")
        .values({ id: auditId, trade_id: tradeId, message: "rollback probe" })
        .execute();
      await scope.unitOfWork.rollback();
    } catch (error) {
      try { await scope.unitOfWork.rollback(); } catch { /* Scope is already closed. */ }
      throw error;
    }

    const verifier = orm.em.fork({ clear: true });
    try {
      expect(await verifier.count(TradeRecord, { id: tradeId })).toBe(0);
      const audit = await verifier
        .getKysely<PocAuditDatabase>()
        .selectFrom("poc_audit")
        .selectAll()
        .where("id", "=", auditId)
        .executeTakeFirst();
      expect(audit).toBeUndefined();
    } finally {
      verifier.clear();
    }
  });


  it("updates an existing aggregate and appends a Refund through Unit of Work registration", async () => {
    const orm = await getOrm();
    const idBase = randomInt(100, 1_000_000_000);
    const tradeId = idBase;
    const orderId = idBase + 1;
    const refundId = idBase + 2;

    try {
      const createScope = await createTradePersistenceScope(orm.em);
      const created = new Trade(tradeId, [new Order(orderId, "Mechanical Keyboard", 1, 9900)]);
      createScope.unitOfWork.registerNew(created);
      await createScope.unitOfWork.commit();

      const updateScope = await createTradePersistenceScope(orm.em);
      const aggregate = await updateScope.tradeRepository.findById(tradeId);
      expect(aggregate).not.toBeNull();
      aggregate!.confirmOrder(orderId);
      aggregate!.refundOrder({
        refundId,
        orderId,
        reason: "Changed my mind",
        eventId: `poc-${refundId}`,
        occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      updateScope.unitOfWork.registerDirty(aggregate!);
      await updateScope.unitOfWork.commit();

      const verifyScope = await createTradePersistenceScope(orm.em);
      try {
        const restored = await verifyScope.tradeRepository.findById(tradeId);
        expect(restored?.orders[0]?.status).toBe("refunded");
        expect(restored?.refunds).toHaveLength(1);
        expect(restored?.domainEvents).toHaveLength(0);
        await verifyScope.unitOfWork.rollback();
      } catch (error) {
        try { await verifyScope.unitOfWork.rollback(); } catch { /* Scope is already closed. */ }
        throw error;
      }
    } finally {
      const cleanup = orm.em.fork({ clear: true });
      try {
        await cleanup.nativeDelete(RefundRecord, { trade: tradeId });
        await cleanup.nativeDelete(OrderRecord, { trade: tradeId });
        await cleanup.nativeDelete(TradeRecord, { id: tradeId });
      } finally {
        cleanup.clear();
      }
    }
  });

});
