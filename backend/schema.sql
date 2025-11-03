-- Trading Journal Database Schema

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(10) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK(trade_type IN ('LONG', 'SHORT')),
    entry_date DATETIME NOT NULL,
    exit_date DATETIME,
    entry_price DECIMAL(10, 2) NOT NULL,
    exit_price DECIMAL(10, 2),
    quantity INTEGER NOT NULL,
    stop_loss DECIMAL(10, 2),
    take_profit DECIMAL(10, 2),
    profit_loss DECIMAL(10, 2),
    profit_loss_percent DECIMAL(5, 2),
    fees DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
    strategy VARCHAR(100),
    notes TEXT,
    screenshot_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_tags (
    trade_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (trade_id, tag_id),
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- Track imported trades to avoid duplicates
CREATE TABLE IF NOT EXISTS imported_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE NOT NULL,
    source VARCHAR(20) DEFAULT 'csv',
    trade_id INTEGER,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_imported_trades_external_id ON imported_trades(external_id);
CREATE INDEX IF NOT EXISTS idx_imported_trades_source ON imported_trades(source);
