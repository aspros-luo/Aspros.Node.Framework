import { MikroORM } from "@mikro-orm/mysql";
import { tradeRecordEntities } from "./records.js";

export interface TradePocOrmOptions {
  /** MySQL connection URL supplied by the caller; never store credentials in source control. */
  readonly clientUrl: string;
  /** Enable MikroORM SQL/discovery logging when diagnosing the isolated experiment. */
  readonly debug?: boolean;
}

/**
 * Create an isolated MikroORM instance for the Trade persistence experiment.
 * 为 Trade 持久化实验创建独立的 MikroORM 实例。
 *
 * Schema lifecycle is deliberately external: this function never creates, drops,
 * updates, or migrates database tables.
 * Schema 生命周期刻意交由外部管理：此函数绝不创建、删除、更新或迁移数据库表。
 */
/** Validate the target before opening any database connection. / 建立数据库连接前验证目标。 */
export function assertTradePocDatabaseUrl(clientUrl: string): void {
  const connection = new URL(clientUrl);
  if (connection.protocol !== "mysql:") {
    throw new TypeError("Trade POC requires a mysql:// connection URL.");
  }
  const databaseName = decodeURIComponent(connection.pathname.slice(1));
  if (databaseName !== "aspros_trade_poc") {
    throw new TypeError("Trade POC may connect only to the dedicated aspros_trade_poc database.");
  }
}

export async function createTradePocOrm(
  options: TradePocOrmOptions,
) {
  assertTradePocDatabaseUrl(options.clientUrl);

  return MikroORM.init({
    entities: [...tradeRecordEntities],
    clientUrl: options.clientUrl,
    debug: options.debug ?? false,
  });
}
