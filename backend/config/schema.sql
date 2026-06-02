-- Run once: mysql -u root -p < backend/config/schema.sql

CREATE DATABASE IF NOT EXISTS phonezone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE phonezone;

CREATE TABLE IF NOT EXISTS shops (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(200),
  phone      VARCHAR(20),
  is_active  TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('admin','manager') NOT NULL DEFAULT 'manager',
  shop_id    INT NULL,
  is_active  TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  category     ENUM('phone','display','battery','charging_port','accessory') NOT NULL,
  compatible   VARCHAR(300),
  cost_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  sell_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock        INT NOT NULL DEFAULT 0,
  barcode      VARCHAR(100) UNIQUE,
  shop_id      INT NOT NULL,
  is_active    TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS selling_invoices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no     VARCHAR(30) NOT NULL UNIQUE,
  customer_id    INT NOT NULL,
  shop_id        INT NOT NULL,
  subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total    DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','bkash','nagad','card','contanti','carta') DEFAULT 'cash',
  created_by     INT NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (shop_id)     REFERENCES shops(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS selling_invoice_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT NOT NULL,
  product_id   INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  qty          INT NOT NULL DEFAULT 1,
  unit_price   DECIMAL(10,2) NOT NULL,
  total_price  DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES selling_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS repair_invoices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no     VARCHAR(30) NOT NULL UNIQUE,
  customer_id    INT NOT NULL,
  shop_id        INT NOT NULL,
  device_brand   VARCHAR(50),
  device_series  VARCHAR(100),
  device_model   VARCHAR(100) NOT NULL,
  imei           VARCHAR(20),
  problem        TEXT,
  parts_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  labor_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  grand_total    DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_date  DATE,
  status         ENUM('pending','in_progress','done','delivered') DEFAULT 'pending',
  created_by     INT NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (shop_id)     REFERENCES shops(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS repair_invoice_parts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT NOT NULL,
  product_id  INT NULL,
  part_name   VARCHAR(200) NOT NULL,
  qty         INT NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES repair_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Seed shops
INSERT IGNORE INTO shops (id, name, location, phone) VALUES
  (1, 'Phonezone — Main',   'Via Roma 1, Milano',    '+39 02 0000001'),
  (2, 'Phonezone — Nord',   'Via Garibaldi 5, Torino','+39 011 0000002'),
  (3, 'Phonezone — Sud',    'Via Toledo 10, Napoli',  '+39 081 0000003');

-- Seed products with barcodes
INSERT IGNORE INTO products (name, category, compatible, cost_price, sell_price, stock, barcode, shop_id) VALUES
  ('iPhone 15 Pro Max',        'phone',        'iPhone 15 Series',  120000, 135000, 5,  'PZ-PHN-001', 1),
  ('Samsung Galaxy S24 Ultra', 'phone',        'Galaxy S24 Series', 95000,  108000, 3,  'PZ-PHN-002', 2),
  ('iPhone 13 Pro Max Display','display',      'iPhone 13 Pro/Max', 18000,  25000,  12, 'PZ-DSP-001', 1),
  ('Samsung A54 Display',      'display',      'Samsung A54',       4500,   7000,   0,  'PZ-DSP-002', 3),
  ('iPhone 12 Battery',        'battery',      'iPhone 12/12 Pro',  1200,   2200,   30, 'PZ-BAT-001', 1),
  ('Type-C Charging Port',     'charging_port','Universal Android', 300,    600,    45, 'PZ-CHG-001', 3),
  ('Lightning Port Module',    'charging_port','iPhone 5–14',       600,    1200,   8,  'PZ-CHG-002', 1),
  ('Realme C55 Display',       'display',      'Realme C55',        2800,   4500,   6,  'PZ-DSP-003', 2);
