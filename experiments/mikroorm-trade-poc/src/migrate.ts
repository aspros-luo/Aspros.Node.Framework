import { applyTradePocMigrations, getTradePocMigrationStatus } from "./migration-runner.js";

async function main(): Promise<void> {
  const command = process.argv[2];
  const clientUrl = process.env.MYSQL_POC_DATABASE_URL;
  if (!clientUrl) {
    throw new Error("MYSQL_POC_DATABASE_URL must point to the disposable aspros_trade_poc database.");
  }

  if (command === "up") {
    console.info(JSON.stringify(await applyTradePocMigrations({ clientUrl }), null, 2));
    return;
  }
  if (command === "status") {
    console.info(JSON.stringify(await getTradePocMigrationStatus({ clientUrl }), null, 2));
    return;
  }
  throw new Error("Expected one command: up | status. Destructive rollback commands are intentionally unavailable.");
}

try {
  await main();
} catch (error) {
  console.error("[Trade POC Migration] Failed:", error);
  process.exitCode = 1;
}
