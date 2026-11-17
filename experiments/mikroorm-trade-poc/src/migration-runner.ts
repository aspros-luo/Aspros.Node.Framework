import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/mysql";
import { Migration20261117000100_CreateTradePocSchema } from "../migrations/Migration20261117000100_CreateTradePocSchema.js";
import { assertTradePocDatabaseUrl, type TradePocOrmOptions } from "./bootstrap.js";
import { tradeRecordEntities } from "./records.js";

export interface TradePocMigrationStatus {
  readonly executed: readonly string[];
  readonly pending: readonly string[];
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
      tableName: "poc_schema_migrations",
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

export async function applyTradePocMigrations(
  options: TradePocOrmOptions,
): Promise<TradePocMigrationStatus> {
  const orm = await createMigrationOrm(options);
  try {
    await orm.migrator.up();
    const executed = await orm.migrator.getExecuted();
    const pending = await orm.migrator.getPending();
    return {
      executed: executed.map((migration) => migration.name),
      pending: pending.map((migration) => migration.name),
    };
  } finally {
    await orm.close(true);
  }
}

export async function getTradePocMigrationStatus(
  options: TradePocOrmOptions,
): Promise<TradePocMigrationStatus> {
  const orm = await createMigrationOrm(options);
  try {
    const executed = await orm.migrator.getExecuted();
    const pending = await orm.migrator.getPending();
    return {
      executed: executed.map((migration) => migration.name),
      pending: pending.map((migration) => migration.name),
    };
  } finally {
    await orm.close(true);
  }
}
