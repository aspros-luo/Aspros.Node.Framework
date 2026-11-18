import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/mysql";
import { Migration20261117000100_CreateTradePocSchema } from "../migrations/Migration20261117000100_CreateTradePocSchema.js";
import { assertTradePocDatabaseUrl, type TradePocOrmOptions } from "./bootstrap.js";
import { tradeRecordEntities } from "./records.js";

const migrationHistoryTable = "poc_schema_migrations";

/**
 * Migration-created-table metadata is used only for safe recovery checks.
 * It is not a second schema definition; the Migration class remains the DDL source of truth.
 * Migration 影响范围元数据只用于安全恢复检查，不是第二份 Schema 定义；DDL 仍以 Migration 类为准。
 */
const migrationDefinitions = [
  {
    migration: Migration20261117000100_CreateTradePocSchema,
    createdTables: ["trades", "orders", "refunds", "poc_audit"],
  },
] as const;

const migrationNames = migrationDefinitions.map(({ migration }) => migration.name);
const expectedSchemaTables = [
  ...new Set(migrationDefinitions.flatMap(({ createdTables }) => createdTables)),
];

export type TradePocSchemaState =
  | "not-applied"
  | "pending"
  | "partially-created-or-unlogged"
  | "applied"
  | "inconsistent"
  | "unknown-migrations";

export interface TradePocMigrationStatus {
  readonly historyTableExists: boolean;
  readonly schemaState: TradePocSchemaState;
  readonly existingSchemaTables: readonly string[];
  readonly missingSchemaTables: readonly string[];
  readonly executed: readonly string[];
  readonly pending: readonly string[];
  readonly unknownExecuted: readonly string[];
}

interface TableNameRow {
  readonly tableName: string;
}

interface MigrationNameRow {
  readonly name: string;
}

interface PendingMigration {
  readonly name: string;
  readonly createdTables: readonly string[];
}

function normalizeMigrationName(name: string): string {
  return name.replace(/\.[jt]s$/, "");
}

function migrationTablePlaceholders(): string {
  return expectedSchemaTables.map(() => "?").join(", ");
}

async function createMigrationOrm(options: TradePocOrmOptions) {
  assertTradePocDatabaseUrl(options.clientUrl);

  return MikroORM.init({
    entities: [...tradeRecordEntities],
    clientUrl: options.clientUrl,
    debug: options.debug ?? false,
    extensions: [Migrator],
    migrations: {
      migrationsList: migrationDefinitions.map(({ migration }) => migration),
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
        AND TABLE_NAME IN (${migrationTablePlaceholders()})`,
    expectedSchemaTables,
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
  const unknownExecuted = findUnknownTradePocMigrations(executed);
  const appliedDefinitions = migrationDefinitions.filter(({ migration }) =>
    executedSet.has(migration.name),
  );
  const appliedTables = new Set(appliedDefinitions.flatMap(({ createdTables }) => createdTables));
  const missingAppliedTables = [...appliedTables].filter((tableName) => !existingSet.has(tableName));
  const unloggedExistingTables = existingSchemaTables.filter((tableName) => !appliedTables.has(tableName));

  let schemaState: TradePocSchemaState;
  if (unknownExecuted.length > 0) {
    schemaState = "unknown-migrations";
  } else if (missingAppliedTables.length > 0) {
    schemaState = "inconsistent";
  } else if (unloggedExistingTables.length > 0) {
    schemaState = "partially-created-or-unlogged";
  } else if (pending.length > 0) {
    schemaState = executed.length === 0 ? "not-applied" : "pending";
  } else {
    schemaState = "applied";
  }

  return {
    historyTableExists,
    schemaState,
    existingSchemaTables,
    missingSchemaTables,
    executed,
    pending,
    unknownExecuted,
  };
}

/**
 * Return applied migration names that are not registered by this application version.
 * 返回当前应用版本未注册、但数据库已记录为执行的 Migration。
 */
export function findUnknownTradePocMigrations(
  executedMigrationNames: readonly string[],
): string[] {
  const registered = new Set(migrationNames);
  return [...new Set(executedMigrationNames.map(normalizeMigrationName))]
    .filter((name) => !registered.has(name));
}

/**
 * Refuse to migrate when the database contains migrations unknown to this application version.
 * 当数据库包含当前应用版本不认识的 Migration 时，拒绝执行迁移。
 */
export function assertKnownTradePocMigrations(
  executedMigrationNames: readonly string[],
): void {
  const unknown = findUnknownTradePocMigrations(executedMigrationNames);
  if (unknown.length > 0) {
    throw new Error([
      "Refusing to run migrations because the database contains migration history entries unknown to this application version.",
      `Unknown executed migrations: ${unknown.join(", ")}.`,
      "This usually means the database is newer than the application or a migration was renamed/removed. Deploy a compatible application version or reconcile the migration history deliberately; do not run an older binary against a newer schema.",
    ].join(" "));
  }
}

/**
 * Refuse only when a pending migration's declared newly created tables already exist.
 * 仅当待执行 Migration 声明要新建的表已经存在时才拒绝执行。
 */
export function assertSafeTradePocMigrationStart(
  pendingMigrations: readonly PendingMigration[],
  existingTableNames: readonly string[],
): void {
  const existing = new Set(existingTableNames);
  for (const migration of pendingMigrations) {
    const conflicts = migration.createdTables.filter((tableName) => existing.has(tableName));
    if (conflicts.length > 0) {
      throw new Error([
        `Refusing to run pending migration "${migration.name}" because tables it is expected to create already exist without an executed migration record.`,
        `Existing tables that this migration would create: ${[...conflicts].sort().join(", ")}.`,
        "MySQL DDL may have committed before a previous run failed. Inspect the actual table definitions and migration history, then repair forward or reset only this disposable POC schema before retrying.",
      ].join(" "));
    }
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
    assertKnownTradePocMigrations(executedRows.map((row) => row.name));

    const pendingRows = await orm.migrator.getPending();
    const pendingMigrations = pendingRows.map((row) => {
      const name = normalizeMigrationName(row.name);
      const definition = migrationDefinitions.find(
        ({ migration }) => migration.name === name,
      );
      if (!definition) {
        throw new Error(`No recovery metadata is registered for pending migration "${name}".`);
      }
      return { name, createdTables: definition.createdTables };
    });

    const existingRows = (await orm.em.getConnection().execute(
      `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${migrationTablePlaceholders()})`,
      expectedSchemaTables,
      "all",
    )) as TableNameRow[];
    const existingTables = existingRows.map((row) => row.tableName);

    assertSafeTradePocMigrationStart(pendingMigrations, existingTables);

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
