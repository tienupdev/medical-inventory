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

INSERT INTO bstien.inventory_category (id, name) VALUES (1, 'ISIS');
INSERT INTO bstien.inventory_category (id, name) VALUES (2, 'La Roche Posay');
INSERT INTO bstien.inventory_category (id, name) VALUES (3, 'MP lẻ');


INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (1, 1, 'tuýp', 'Teenderm Gel Sensitive 250ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (2, 1, 'tuýp', 'Teenderm Gel 150ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (3, 1, 'tuýp', 'Sensylia 24 Legere 40ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (4, 1, 'tuýp', 'Teenderm Alpha Pure 30ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (5, 1, 'tuýp', 'Neotone Gel 150ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (6, 1, 'tuýp', 'Neotone Radian 300ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (7, 1, 'tuýp', 'Glyco-A Medium Peeling 30ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (8, 1, 'tuýp', 'Secalia AHA 200ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (9, 1, 'tuýp', 'Secalia Shower Cream 200ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (10, 1, 'chai', 'Secalia Aqua', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (11, 1, 'tuýp', 'Neotone Sensitive 30ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (12, 1, 'tuýp', 'Secalia Balm 200ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (13, 1, 'tuýp', 'Neotone Serum 30ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (14, 1, 'tuýp', 'Vitiskim', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (15, 1, 'tuýp', 'Uvebloul', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (16, 1, 'tuýp', 'Effilar 50ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (17, 1, 'tuýp', 'Mini Effaclair Gel Mous 50ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (18, 2, 'tuýp', 'Effaclair Duo+ 40ml', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (19, 2, 'tuýp', 'Miclia B3 Serum', 0.00);
INSERT INTO bstien.inventory (id, category_id, unit, name, count) VALUES (20, 2, 'tuýp', 'Decos Energy Stimulating 200ml', 0.00);

