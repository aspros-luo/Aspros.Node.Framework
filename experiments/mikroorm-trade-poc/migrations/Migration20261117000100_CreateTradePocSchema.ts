import { Migration } from "@mikro-orm/migrations";

/** Initial disposable Trade POC schema. / Trade POC 一次性实验数据库的初始 Schema。 */
export class Migration20261117000100_CreateTradePocSchema extends Migration {
  override isTransactional(): boolean {
    return false;
  }

  override async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS trades (
      id INT NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB;`);

    this.addSql(`CREATE TABLE IF NOT EXISTS orders (
      id INT NOT NULL,
      trade_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_price_minor INT NOT NULL,
      status ENUM('pending', 'confirmed', 'refunded') NOT NULL,
      PRIMARY KEY (id),
      KEY idx_orders_trade_id (trade_id),
      UNIQUE KEY uq_orders_id_trade_id (id, trade_id),
      CONSTRAINT fk_orders_trade FOREIGN KEY (trade_id) REFERENCES trades (id)
    ) ENGINE=InnoDB;`);

    this.addSql(`CREATE TABLE IF NOT EXISTS refunds (
      id INT NOT NULL,
      trade_id INT NOT NULL,
      order_id INT NOT NULL,
      amount_minor INT NOT NULL,
      reason TEXT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_refunds_order_id (order_id),
      KEY idx_refunds_trade_id (trade_id),
      CONSTRAINT fk_refunds_trade FOREIGN KEY (trade_id) REFERENCES trades (id),
      CONSTRAINT fk_refunds_order_trade FOREIGN KEY (order_id, trade_id) REFERENCES orders (id, trade_id)
    ) ENGINE=InnoDB;`);

  }

  override async down(): Promise<void> {
    this.addSql("DROP TABLE IF EXISTS refunds;");
    this.addSql("DROP TABLE IF EXISTS orders;");
    this.addSql("DROP TABLE IF EXISTS trades;");
  }
}
