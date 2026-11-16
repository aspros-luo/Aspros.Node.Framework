-- Disposable Trade POC schema only. / 仅用于一次性 Trade POC 数据库。
-- Create the dedicated database separately before applying this file.
-- 应先单独创建专用数据库，再执行本文件。
-- These statements are idempotent and do not drop or alter existing tables.
-- 以下语句可重复执行，不会删除或修改已有表。

CREATE TABLE IF NOT EXISTS trades (
  id INT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id INT NOT NULL,
  trade_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price_minor INT NOT NULL,
  status ENUM('pending', 'confirmed', 'refunded') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_trade_id (trade_id),
  UNIQUE KEY uq_orders_id_trade_id (id, trade_id),
  CONSTRAINT fk_orders_trade
    FOREIGN KEY (trade_id) REFERENCES trades (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  id INT NOT NULL,
  trade_id INT NOT NULL,
  order_id INT NOT NULL,
  amount_minor INT NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refunds_order_id (order_id),
  KEY idx_refunds_trade_id (trade_id),
  CONSTRAINT fk_refunds_trade
    FOREIGN KEY (trade_id) REFERENCES trades (id),
  CONSTRAINT fk_refunds_order_trade
    FOREIGN KEY (order_id, trade_id) REFERENCES orders (id, trade_id)
) ENGINE=InnoDB;
