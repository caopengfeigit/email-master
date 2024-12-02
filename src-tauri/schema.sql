CREATE TABLE IF NOT EXISTS seaql_migrations ( version text NOT NULL PRIMARY KEY, applied_at bigint NOT NULL );
CREATE TABLE IF NOT EXISTS clients ( id text NOT NULL PRIMARY KEY, full_name text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, phone_number text, email text, address text, image text );
CREATE TABLE IF NOT EXISTS suppliers ( id text NOT NULL PRIMARY KEY, full_name text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, phone_number text, email text, address text, image text );
CREATE TABLE IF NOT EXISTS products ( id text NOT NULL PRIMARY KEY, name text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, description text, price real NOT NULL DEFAULT 0, min_quantity real NOT NULL DEFAULT 0, image text );
CREATE TABLE IF NOT EXISTS inventory_mouvements ( id text NOT NULL PRIMARY KEY, mvm_type text NOT NULL, quantity real NOT NULL DEFAULT 0, product_id text NOT NULL, FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS orders ( id text NOT NULL PRIMARY KEY, client_id text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, status text NOT NULL, FOREIGN KEY (client_id) REFERENCES suppliers (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS order_items ( id text NOT NULL PRIMARY KEY, price real NOT NULL DEFAULT 0, order_id text NOT NULL, inventory_id text NOT NULL UNIQUE, FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE, FOREIGN KEY (inventory_id) REFERENCES inventory_mouvements (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS invoices ( id text NOT NULL PRIMARY KEY, client_id text NOT NULL, paid_amount real NOT NULL DEFAULT 0, status text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS invoice_items ( id text NOT NULL PRIMARY KEY, price real NOT NULL DEFAULT 0, invoice_id text NOT NULL, inventory_id text NOT NULL UNIQUE, FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE, FOREIGN KEY (inventory_id) REFERENCES inventory_mouvements (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS quotes ( id text NOT NULL PRIMARY KEY, client_id text NOT NULL, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE );
CREATE TABLE IF NOT EXISTS quote_items ( id text NOT NULL PRIMARY KEY, price real NOT NULL DEFAULT 0, product_id text NOT NULL, quote_id text NOT NULL, FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE, FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE );
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_clients_fullname ON clients (full_name);
CREATE INDEX idx_suppliers_fullname ON suppliers (full_name);
CREATE INDEX idx_products_name ON products (name);


