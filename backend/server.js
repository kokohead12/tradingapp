const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'trading.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database with schema
function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error initializing database:', err);
    } else {
      console.log('Database initialized successfully');
    }
  });
}

// ==================== TRADE ROUTES ====================

// Get all trades
app.get('/api/trades', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM trades';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY entry_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single trade
app.get('/api/trades/:id', (req, res) => {
  db.get('SELECT * FROM trades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json(row);
  });
});

// Create new trade
app.post('/api/trades', (req, res) => {
  const {
    symbol,
    trade_type,
    entry_date,
    exit_date,
    entry_price,
    exit_price,
    quantity,
    stop_loss,
    take_profit,
    fees,
    strategy,
    notes,
    screenshot_url
  } = req.body;

  // Calculate P&L if exit price is provided
  let profit_loss = null;
  let profit_loss_percent = null;
  let status = 'OPEN';

  if (exit_price) {
    const total_entry = entry_price * quantity;
    const total_exit = exit_price * quantity;
    profit_loss = trade_type === 'LONG'
      ? (total_exit - total_entry - (fees || 0))
      : (total_entry - total_exit - (fees || 0));
    profit_loss_percent = (profit_loss / total_entry) * 100;
    status = 'CLOSED';
  }

  const query = `
    INSERT INTO trades (
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Trade created successfully' });
    }
  );
});

// Update trade
app.put('/api/trades/:id', (req, res) => {
  const {
    symbol,
    trade_type,
    entry_date,
    exit_date,
    entry_price,
    exit_price,
    quantity,
    stop_loss,
    take_profit,
    fees,
    strategy,
    notes,
    screenshot_url
  } = req.body;

  // Calculate P&L if exit price is provided
  let profit_loss = null;
  let profit_loss_percent = null;
  let status = 'OPEN';

  if (exit_price) {
    const total_entry = entry_price * quantity;
    const total_exit = exit_price * quantity;
    profit_loss = trade_type === 'LONG'
      ? (total_exit - total_entry - (fees || 0))
      : (total_entry - total_exit - (fees || 0));
    profit_loss_percent = (profit_loss / total_entry) * 100;
    status = 'CLOSED';
  }

  const query = `
    UPDATE trades SET
      symbol = ?, trade_type = ?, entry_date = ?, exit_date = ?,
      entry_price = ?, exit_price = ?, quantity = ?, stop_loss = ?,
      take_profit = ?, profit_loss = ?, profit_loss_percent = ?,
      fees = ?, status = ?, strategy = ?, notes = ?, screenshot_url = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    query,
    [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url, req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Trade not found' });
        return;
      }
      res.json({ message: 'Trade updated successfully' });
    }
  );
});

// Delete trade
app.delete('/api/trades/:id', (req, res) => {
  db.run('DELETE FROM trades WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json({ message: 'Trade deleted successfully' });
  });
});

// ==================== STATISTICS ROUTES ====================

// Get trading statistics
app.get('/api/stats', (req, res) => {
  const stats = {};

  // Get overall stats
  const overallQuery = `
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_trades,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_trades,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
      SUM(profit_loss) as total_profit_loss,
      AVG(profit_loss) as avg_profit_loss,
      MAX(profit_loss) as best_trade,
      MIN(profit_loss) as worst_trade,
      AVG(profit_loss_percent) as avg_return_percent
    FROM trades
    WHERE status = 'CLOSED'
  `;

  db.get(overallQuery, [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const winRate = row.closed_trades > 0
      ? (row.winning_trades / row.closed_trades) * 100
      : 0;

    stats.overall = {
      ...row,
      win_rate: winRate.toFixed(2)
    };

    // Get stats by symbol
    const symbolQuery = `
      SELECT
        symbol,
        COUNT(*) as trades_count,
        SUM(profit_loss) as total_pl,
        AVG(profit_loss) as avg_pl,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
        COUNT(*) as total
      FROM trades
      WHERE status = 'CLOSED'
      GROUP BY symbol
      ORDER BY total_pl DESC
    `;

    db.all(symbolQuery, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      stats.by_symbol = rows.map(row => ({
        ...row,
        win_rate: ((row.wins / row.total) * 100).toFixed(2)
      }));

      res.json(stats);
    });
  });
});

// Get monthly performance
app.get('/api/stats/monthly', (req, res) => {
  const query = `
    SELECT
      strftime('%Y-%m', entry_date) as month,
      COUNT(*) as trades_count,
      SUM(profit_loss) as total_pl,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      COUNT(*) as total
    FROM trades
    WHERE status = 'CLOSED'
    GROUP BY month
    ORDER BY month DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const result = rows.map(row => ({
      ...row,
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));

    res.json(result);
  });
});

// ==================== TAG ROUTES ====================

// Get all tags
app.get('/api/tags', (req, res) => {
  db.all('SELECT * FROM tags ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create tag
app.post('/api/tags', (req, res) => {
  const { name, color } = req.body;

  db.run(
    'INSERT INTO tags (name, color) VALUES (?, ?)',
    [name, color || '#3B82F6'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Tag created successfully' });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trading Journal API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
