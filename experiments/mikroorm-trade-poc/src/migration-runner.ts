import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/mysql";
import { Migration20261117000100_CreateTradePocSchema } from "../migrations/Migration20261117000100_CreateTradePocSchema.js";
import { assertTradePocDatabaseUrl, type TradePocOrmOptions } from "./bootstrap.js";
import { tradeRecordEntities } from "./records.js";

const migrationHistoryTable = "poc_schema_migrations";
const expectedSchemaTables = ["trades", "orders", "refunds", "poc_audit"] as const;
const migrationNames = [Migration20261117000100_CreateTradePocSchema.name] as const;

export type TradePocSchemaState =
  | "not-applied"
  | "partially-created-or-unlogged"
  | "applied"
  | "inconsistent";

export interface TradePocMigrationStatus {
  readonly historyTableExists: boolean;
  readonly schemaState: TradePocSchemaState;
  readonly existingSchemaTables: readonly string[];
  readonly missingSchemaTables: readonly string[];
  readonly executed: readonly string[];
  readonly pending: readonly string[];
}

interface TableNameRow {
  readonly tableName: string;
}

interface MigrationNameRow {
  readonly name: string;
}

function normalizeMigrationName(name: string): string {
  return name.replace(/\.[jt]s$/, "");
}

async function createMigrationOrm(options: TradePocOrmOptions) {
  assertTradePocDatabaseUrl(options.clientUrl);

  return MikroORM.init({
    entities: [...tradeRecordEntities],
    clientUrl: options.clientUrl,
    debug: options.debug ?? false,
    extensions: [Migrator],
    migrations: {
      migrationsList: [Migration20261117000100_CreateTradePocSchema],
      tableName: migrationHistoryTable,
      transactional: false,
      allOrNothing: false,
      dropTables: false,
      safe: true,
      snapshot: false,
      snapshotOnMigrate: false,
      silent: false,
    },
  });
}

async function readMigrationStatus(
  orm: { em: { getConnection(): { execute(query: string, params?: readonly unknown[], method?: "all" | "get" | "run"): Promise<unknown> } } },
): Promise<TradePocMigrationStatus> {
  const connection = orm.em.getConnection();

  const tableRows = (await connection.execute(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (?, ?, ?, ?)`,
    [...expectedSchemaTables],
    "all",
  )) as TableNameRow[];

  const existingSchemaTables = tableRows.map((row) => row.tableName).sort();
  const existingSet = new Set(existingSchemaTables);
  const missingSchemaTables = expectedSchemaTables.filter((tableName) => !existingSet.has(tableName));

  const historyRows = (await connection.execute(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [migrationHistoryTable],
    "all",
  )) as TableNameRow[];
  const historyTableExists = historyRows.length > 0;

  let executed: string[] = [];
  if (historyTableExists) {
    const migrationRows = (await connection.execute(
      "SELECT name FROM `poc_schema_migrations` ORDER BY id ASC",
      [],
      "all",
    )) as MigrationNameRow[];
    executed = migrationRows.map((row) => normalizeMigrationName(row.name));
  }

  const executedSet = new Set(executed);
  const pending = migrationNames.filter((name) => !executedSet.has(name));
  const initialMigrationApplied = executedSet.has(migrationNames[0]);

  let schemaState: TradePocSchemaState;
  if (initialMigrationApplied) {
    schemaState = missingSchemaTables.length === 0 ? "applied" : "inconsistent";
  } else {
    schemaState = existingSchemaTables.length === 0 ? "not-applied" : "partially-created-or-unlogged";
  }

  return {
    historyTableExists,
    schemaState,
    existingSchemaTables,
    missingSchemaTables,
    executed,
    pending,
  };
}

/**
 * Refuse a pending migration when its target tables already exist without a history record.
 * 待执行 Migration 缺少历史记录、但目标表已存在时拒绝继续执行。
 */
export function assertSafeTradePocMigrationStart(
  pendingMigrationNames: readonly string[],
  executedMigrationNames: readonly string[],
  existingTableNames: readonly string[],
): void {
  const executed = new Set(executedMigrationNames.map(normalizeMigrationName));
  const hasUnloggedPendingMigration = pendingMigrationNames.some(
    (name) => !executed.has(normalizeMigrationName(name)),
  );

  if (hasUnloggedPendingMigration && existingTableNames.length > 0) {
    throw new Error([
      "Refusing to rerun a pending migration because target POC tables already exist without an executed migration record.",
      `Existing tables: ${[...existingTableNames].sort().join(", ")}.`,
      "MySQL DDL may have committed before a previous run failed. Inspect the actual table definitions and migration history, then repair forward or reset this disposable POC database before retrying.",
    ].join(" "));
  }
}

function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, ...(error.stack ? { stack: error.stack } : {}) };
  }
  return { message: String(error) };
}

export async function applyTradePocMigrations(
  options: TradePocOrmOptions,
): Promise<TradePocMigrationStatus> {
  const orm = await createMigrationOrm(options);
  let activeMigration: { name: string; startedAt: number; startedAtIso: string } | undefined;

  try {
    // "up" is mutating: Migrator initialization ensures its history table exists.
    // up 会修改数据库：Migrator 初始化时会确保历史表存在。
    const executedRows = await orm.migrator.getExecuted();
    const pendingRows = await orm.migrator.getPending();
    const executed = new Set(executedRows.map((row) => normalizeMigrationName(row.name)));
    const pending = pendingRows.map((row) => normalizeMigrationName(row.name));
    const existingRows = (await orm.em.getConnection().execute(
      `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (?, ?, ?, ?)`,
      [...expectedSchemaTables],
      "all",
    )) as TableNameRow[];
    const existingTables = existingRows.map((row) => row.tableName);

    assertSafeTradePocMigrationStart(pending, [...executed], existingTables);

    orm.migrator.on("migrating", (migration) => {
      activeMigration = {
        name: migration.name,
        startedAt: Date.now(),
        startedAtIso: new Date().toISOString(),
      };
      console.info(JSON.stringify({
        event: "migration.started",
        migration: migration.name,
        timestamp: activeMigration.startedAtIso,
      }));
    });

    orm.migrator.on("migrated", (migration) => {
      const finishedAt = Date.now();
      const startedAt = activeMigration;
      console.info(JSON.stringify({
        event: "migration.completed",
        migration: migration.name,
        startedAt: startedAt?.startedAtIso,
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: startedAt ? finishedAt - startedAt.startedAt : undefined,
      }));
      activeMigration = undefined;
    });

    await orm.migrator.up();
    return await readMigrationStatus(orm);
  } catch (error) {
    console.error(JSON.stringify({
      event: "migration.failed",
      migration: activeMigration?.name,
      startedAt: activeMigration?.startedAtIso,
      failedAt: new Date().toISOString(),
      durationMs: activeMigration ? Date.now() - activeMigration.startedAt : undefined,
      error: describeError(error),
    }));
    throw error;
  } finally {
    await orm.close(true);
  }
}

/**
 * Inspect migration state without creating or changing the migration history table.
 * 检查迁移状态，但不创建或修改迁移历史表。
 */
export async function getTradePocMigrationStatus(
  options: TradePocOrmOptions,
): Promise<TradePocMigrationStatus> {
  assertTradePocDatabaseUrl(options.clientUrl);
  const orm = await MikroORM.init({
    entities: [...tradeRecordEntities],
    clientUrl: options.clientUrl,
    debug: options.debug ?? false,
  });

  try {
    return await readMigrationStatus(orm);
  } finally {
    await orm.close(true);
  }
}
