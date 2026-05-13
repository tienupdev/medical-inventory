-- ============================================================
-- Inventory Management Schema (MySQL / MariaDB)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_category (
  id   INT          NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory (
  id          INT            NOT NULL AUTO_INCREMENT,
  category_id INT            NOT NULL,
  unit        VARCHAR(50)    NOT NULL,
  name        VARCHAR(255)   NOT NULL,
  count       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_inventory_category
    FOREIGN KEY (category_id) REFERENCES inventory_category (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_activity (
  id           INT            NOT NULL AUTO_INCREMENT,
  inventory_id INT            NOT NULL,
  count_change DECIMAL(12, 2) NOT NULL,         -- positive = nhập, negative = xuất
  description  TEXT           DEFAULT NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_activity_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_activity_inventory_created
  ON inventory_activity (inventory_id, created_at);

-- ============================================================
-- Sample data (optional – remove before production)
-- ============================================================

INSERT INTO inventory_category (name) VALUES
  ('Thực phẩm khô'),
  ('Đồ uống'),
  ('Vệ sinh');

INSERT INTO inventory (category_id, unit, name, count) VALUES
  (1, 'kg',   'Gạo tẻ',        50),
  (1, 'thùng','Mì ăn liền',    12),
  (2, 'thùng','Nước suối 500ml', 8),
  (2, 'chai', 'Nước ngọt có ga', 2),
  (3, 'lọ',   'Nước rửa tay',   5);
